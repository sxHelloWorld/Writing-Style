import re
import pymysql
import logging
from word_file import WordFile
import operator

class InformalWordInfo:
    def __init__(self, index, word, headwords):
        self.index = index
        self.word = word
        self.headwords = headwords

    def __str__(self):
        return '%d %s - %s' % (self.index, self.word, ';'.join(self.headwords))
    __repr__ = __str__

class Suggestion:
    def __init__(self, index, word, suggestions):
        self.index = index
        self.word = word
        self.suggestions = self._clean_suggestions(suggestions)

    def _clean_suggestions(self, suggestions):
        cleaned_suggestions = {}
        for headword, suggs in suggestions.items():
            cleaned_suggs = []
            for sugg in suggs:
                sugg_words = sugg.split(' ')
                if len(sugg_words) <= 2:
                    cleaned_suggs.append(sugg)
            
            if len(cleaned_suggs) > 0:
                cleaned_suggestions[headword] = cleaned_suggs

        return cleaned_suggestions

    def __str__(self):
        return '%d %s - %s' % (self.index, self.word, ';'.join(self.suggestions))
    __repr__ = __str__

class Analyzer:
    def __init__(self, writing):
        self.writing = writing

        self.connection = pymysql.connect(host='ws-db.cxn6r23mlloe.us-east-1.rds.amazonaws.com', user='wsuser', password='', db='corpus')
        self.cursor = self.connection.cursor(pymysql.cursors.DictCursor)

        self.informal_word_file = WordFile('words.csv')

    def _clean_text(self, text):
        cleaned_word = re.sub(r'([^\w])+|(\d)+', '', text)
        return cleaned_word
    
    def analyze(self):
        word_tokens = self.writing.split()

        repeat_word_stats = {}

        # find all of the informal words
        informal_word_info = []
        for index, wtok in enumerate(word_tokens):
            word = self._clean_text(wtok).lower()

            if word in self.informal_word_file.words:
                headwords = self.informal_word_file.words[word]
                word_info = InformalWordInfo(index, word, headwords)

                informal_word_info.append(word_info)

            if repeat_word_stats.get(word) is None:
                repeat_word_stats[word] = [1, str(index)]
            else:
                repeat_word_stats[word][0] += 1
                repeat_word_stats[word][1] += "," + str(index)

        suggestions = self._get_suggestions(informal_word_info)
        trimmed_suggestions = []
        for new_sugg in suggestions:
            headword_suggs_trimmed = {}
            for headword in new_sugg.suggestions:
                headword_suggs_trimmed[headword] = new_sugg.suggestions[headword][:5]

            suggestion = {
                'index': new_sugg.index,
                'type': 'informal',
                'replaceWords': headword_suggs_trimmed
            }
            trimmed_suggestions.append(suggestion)

        repeat_suggestions = self._get_repeat_suggestions(repeat_word_stats)
        for new_sugg in repeat_suggestions:
            index_array = repeat_word_stats[new_sugg[0]][1].split(',')
            for index in index_array:
                suggestion = {
                'index': int(index),
                'word': new_sugg[0],
                'type': 'repeated',
                'replaceWords': new_sugg[1]
                }
                trimmed_suggestions.append(suggestion)

        return trimmed_suggestions

    def _build_headword_synonym_query(self, informal_word_infos):
        headwords = []
        for word_info in informal_word_infos:
            for headword in word_info.headwords:
                headwords.append("'%s'" % headword)

        headwords_csv = ','.join(headwords)
        query = 'SELECT headword, group_concat(word) FROM thesaurus ' + \
                    'WHERE headword IN (%s) ' % headwords_csv + \
                    'GROUP BY headword;'

        return query

    def _get_suggestions(self, informal_word_infos):
        logging.debug('Informal word infos: ' + str(informal_word_infos))
        all_headwords_query = self._build_headword_synonym_query(informal_word_infos)
        self.cursor.execute(all_headwords_query)

        headword_synonym_data = self.cursor.fetchall()
        logging.debug('Headword synonym data: ' + str(headword_synonym_data))
        if headword_synonym_data == None:
            return []

        # build a hash table to quickly look up the headwords words synonyms
        headword_lookup = {}
        for row in headword_synonym_data:
            headword = row['headword'].strip().upper()
            suggestions = row['group_concat(word)'].split(',')

            headword_lookup[headword] = suggestions
        
        logging.debug('Headword lookup: ' + str(headword_lookup))
        suggestions = []
        for word_info in informal_word_infos:
            headword_suggestions = {}
            for headword in word_info.headwords:
                if headword in headword_lookup:
                    headword_suggestions[headword] = headword_lookup[headword]

            suggestion = Suggestion(word_info.index, word_info.word, headword_suggestions)
            suggestions.append(suggestion)
        
        logging.debug('suggestions: ' + str(suggestions))
        return suggestions
        
    def _get_repeat_suggestions(self, stats):
        total_counter = 0
        
        for key, value in stats.items():
            total_counter += value[0]

        suggestions = []

        # apply 5% to counter (total of word) to decide if there is enough repeated words in the content
        selection = round(0.05 * total_counter)

        if selection != 0:
            # Sort by word's counter
            sorted_by_counter = sorted(stats.items(), key=lambda kv: -kv[1][0])

            for index in range(selection):
                # Checks if word's counter is 5% or more of the content text
                if (sorted_by_counter[index][1][0] / total_counter) > 0.05:
                    # Placeholder for retrieving suggestions from Database
                    suggestions.append([sorted_by_counter[index][0], ['placeholder']])

        return suggestions

    def _get_formality_for_words(self):
        words = self._clean_text(self.writing).split()
        word_list = ', '.join(["'%s'" % w.lower() for w in words])
    
        query = 'SELECT regWord, formalityScore FROM words WHERE regWord IN (%s);' % word_list
        self.cursor.execute(query)

        word_formality_rows = self.cursor.fetchall()
        word_formality = {}

        for row in word_formality_rows:
            word_formality[row['regWord']] = row['formalityScore']

        return word_formality

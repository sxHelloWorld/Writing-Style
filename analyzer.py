import re
import pymysql
from word_file import WordFile

class InformalWordInfo:
    def __init__(self, index, word, headwords):
        self.index = index
        self.word = word
        self.headwords = headwords

class Suggestion:
    def __init__(self, index, word, suggestions):
        self.index = index
        self.word = word
        self.suggestions = suggestions

class Analyzer:
    def __init__(self, writing):
        self.writing = writing

        self.connection = pymysql.connect(host='ws-db.cxn6r23mlloe.us-east-1.rds.amazonaws.com', user='ws_root', password='NIlmodOjvetikc2', db='corpus')
        self.cursor = self.connection.cursor(pymysql.cursors.DictCursor)

        self.informal_word_file = WordFile('words.txt')
        print(self.informal_word_file.words)

    def _clean_text(self, text):
        cleaned_word = re.sub(r'([^\w])+|(\d)+', '', text)
        return cleaned_word
    
    def analyze(self):
        word_tokens = self.writing.split()

        # find all of the informal words
        informal_word_info = []
        for index, wtok in enumerate(word_tokens):
            word = self._clean_text(wtok).lower()

            if word in self.informal_word_file.words:
                headwords = self.informal_word_file.words[word]
                word_info = InformalWordInfo(index, word, headwords)

                informal_word_info.append(word_info)

        suggestions = self._get_suggestions(informal_word_info)
        old_suggestions = []
        for new_sugg in suggestions:
            all_words = []
            for headword in new_sugg.suggestions:
                all_words.extend(new_sugg.suggestions[headword])

            suggestion = {
                'index': new_sugg.index,
                'type': 'informal',
                'replaceWords': all_words[:5]
            }
            old_suggestions.append(suggestion)

        return old_suggestions

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
        all_headwords_query = self._build_headword_synonym_query(informal_word_infos)
        self.cursor.execute(all_headwords_query)

        headword_synonym_data = self.cursor.fetchall()
        if headword_synonym_data == None:
            return []

        # build a hash table to quickly look up the headwords words synonyms
        headword_lookup = {}
        for row in headword_synonym_data:
            headword = row['headword'].strip()
            suggestions = row['group_concat(word)'].split(',')

            headword_lookup[headword] = suggestions
        
        suggestions = []
        for word_info in informal_word_infos:
            headword_suggestions = {}
            for headword in word_info.headwords:
                if headword in headword_lookup:
                    headword_suggestions[headword] = headword_lookup[headword]
                else:
                    headword_suggestions[headword] = ['NONE FOUND']

            suggestion = Suggestion(word_info.index, word_info.word, headword_suggestions)
            suggestions.append(suggestion)
        
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

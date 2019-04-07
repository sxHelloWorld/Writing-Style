'''
Writing Style Web App Release 1
Author: Adam Spindler
Last Updated: March 21, 2019

This analyzer.py provides the functionality for analyzing a given body of text, and providing suggestions for that piece of text. 

'''
import re
import pymysql
import logging
from word_file import WordFile
import operator

stopwords = ["i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"]

'''
Class representing an informal word and it's information 
'''
class InformalWordInfo:
    '''
    Creates instance of InformalWordInfo

    @params
    self - InformalWordInfo
    index - int
    word - String
    headwords - list
    '''
    def __init__(self, index, word, headwords):
        self.index = index
        self.word = word
        self.headwords = headwords

    def __str__(self):
        return '%d %s - %s' % (self.index, self.word, ';'.join(self.headwords))
    __repr__ = __str__

'''
Class representing a suggestion and it's related information 
'''
class Suggestion:
    '''
    Creates instance of InformalWordInfo

    @params
    self - Suggestion
    index - int
    word - String
    suggestions - list
    '''
    def __init__(self, index, word, suggestions):
        self.index = index
        self.word = word
        self.suggestions = self._clean_suggestions(suggestions)

    '''
    Prunes and returns a list of suggestions 

    @param
    self - Suggestion
    suggestions - list

    @return
    cleaned_suggestions - list
    '''  
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
    '''
    Creates instance of Analyzer

    @params
    self - Analyzer
    writing - String
    '''
    def __init__(self, writing):
        self.writing = writing

        self.connection = pymysql.connect(host='ws-db.cxn6r23mlloe.us-east-1.rds.amazonaws.com', user='wsuser', password='', db='corpus')
        self.cursor = self.connection.cursor(pymysql.cursors.DictCursor)

        self.informal_word_file = WordFile('words.csv')
    '''
    Prunes and returns text
    @param
    self - Analyzer
    text - list

    @return
    cleaned_word - list
    '''  
    def _clean_text(self, text):
        cleaned_word = re.sub(r'([^\w])+|(\d)+', '', text)
        return cleaned_word
    '''
    Analyzes the writing associated with the Analyzer, returning a list of suggestions
    
    @param
    self - Analyzer

    @return
    trimmed_suggestions - list
    '''  
    def analyze(self):
        word_tokens = self.writing.split()

        cleaned_word_tokens = []
        for wtok in word_tokens:
            word = self._clean_text(wtok).lower()
            cleaned_word_tokens.append(word)

        root_words = self._get_root_words_for_words(cleaned_word_tokens)
        print(root_words)

        repeat_word_stats = {}

        # find all of the informal words
        informal_word_info = []
        for index, word in enumerate(cleaned_word_tokens):
            root_word = root_words[word]

            if root_word in self.informal_word_file.words:
                headwords = self.informal_word_file.words[root_word]
                word_info = InformalWordInfo(index, root_word, headwords)

                informal_word_info.append(word_info)

            if repeat_word_stats.get(root_word) is None:
                repeat_word_stats[root_word] = [1, str(index)]
            else:
                repeat_word_stats[root_word][0] += 1
                repeat_word_stats[root_word][1] += "," + str(index)

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
        for repeat_sugg in repeat_suggestions:
            word_index = repeat_sugg['index']

            # make sure there isn't already a suggestion for this word index
            found = False
            for sugg in trimmed_suggestions:
                if sugg['index'] == word_index:
                    found = True
                    break
        
            if not found:
                trimmed_suggestions.append(repeat_sugg)

        return trimmed_suggestions
    '''
    Builds a string in the proper format to be used in a database query
    from a list of informal_word_info
    
    @param
    self - Analyzer
    informal_word_infos - list
    
    @return
    query - string
    '''  
    def _build_headword_synonym_query_from_informal(self, informal_word_infos):
        headwords = []
        for word_info in informal_word_infos:
            for headword in word_info.headwords:
                headwords.append("'%s'" % headword)

        if len(headwords) == 0:
            return None

        return self._build_headword_synonym_query(headwords)

    '''
    Builds a string in the proper format to be used in a database query
    
    @param
    self - Analyzer
    informal_word_infos - list
    
    @return
    query - string
    '''  
    def _build_headword_synonym_query(self, headwords):
        headwords_csv = ','.join(headwords)
        query = 'SELECT headword, group_concat(word) FROM thesaurus ' + \
                    'WHERE headword IN (%s) ' % headwords_csv + \
                    'GROUP BY headword;'

        return query

    '''
    Execute a query to find all of the synonyms for headwords

    @param
    self - Analyzer
    query - str

    @return
    headword_lookup - dict
    '''
    def _execute_headword_query(self, query):
        self.cursor.execute(query)

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

        return headword_lookup

    '''
    Creates a list of suggestions for the given informal words
    
    @param
    self - Analyzer
    informal_word_infos - list
    
    @return
    suggestions - list
    '''  
    def _get_suggestions(self, informal_word_infos):
        logging.debug('Informal word infos: ' + str(informal_word_infos))
        all_headwords_query = self._build_headword_synonym_query_from_informal(informal_word_infos)
        
        if all_headwords_query is None:
            return []
        headword_lookup = self._execute_headword_query(all_headwords_query)

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
    '''
    Creates a list of suggestions for words that meet the repeated word status 
    
    @param
    self - Analyzer
    stats - dict
    
    @return
    suggestions - list
    ''' 
    def _get_repeat_suggestions(self, stats):
        total_counter = 0
        
        for key, value in stats.items():
            total_counter += value[0]

        suggestions = []

        # apply 5% to counter (total of word) to decide if there is enough repeated words in the content
        selection = round(0.05 * total_counter)

        repeated_words = []
        if selection != 0:
            # Sort by word's counter
            sorted_by_counter = sorted(stats.items(), key=lambda kv: -kv[1][0])

            for index in range(selection):
                # Checks if word's counter is 5% or more of the content text
                if (sorted_by_counter[index][1][0] / total_counter) > 0.05:
                    # Placeholder for retrieving suggestions from Database
                    repeated_word = sorted_by_counter[index][0]
                    if repeated_word not in stopwords:
                        repeated_words.append(repeated_word)

        if len(repeated_words) == 0:
            return []

        headwords = self._get_headwords_for_words(repeated_words)
        if len(headwords) == 0:
            return []
        headword_query = self._build_headword_synonym_query(['\'%s\'' % w for w in list(headwords.values())])
        headword_lookup = self._execute_headword_query(headword_query)

        # create the suggestion objects
        for word in repeated_words:
            if word in headwords:
                headword = headwords[word].strip().upper()
                synonyms = headword_lookup[headword]

                indices_str = stats[word][1].split(',')
                for index_str in indices_str:
                    index = int(index_str)
                    suggestion = {
                        'index': index,
                        'type': 'repeated',
                        'replaceWords': {
                            headword: synonyms[:5]
                        }
                    } 

                    suggestions.append(suggestion)

        return suggestions

    '''
    Get the headwords for each of the words

    @param
    self - Analyzer
    words - list of words to get the headwords of
    
    @return
    word_headwords - dict
    '''
    def _get_headwords_for_words(self, words):
        query = self._build_get_headwords_query(words)
        self.cursor.execute(query)

        word_headwords = {}
        headword_result = self.cursor.fetchall()
        for row in headword_result:
            word = row['word']
            headword = row['headword']

            if word not in word_headwords:
                word_headwords[word] = headword
        
        return word_headwords

    '''
    Creates a query to find the headwords that each of the words corresponds to

    @param
    self - Analayzer
    words - list of words to get the headwords of

    @return
    query - str
    '''
    def _build_get_headwords_query(self, words):
        query = 'SELECT word, headword FROM thesaurus WHERE word IN(%s);'
        word_strs = ['\'%s\'' % w for w in words]
        
        query_final = query % ', '.join(word_strs)

        return query_final

    '''
    Queries the database to acquire the formality score for all the words inputted into the Analyzer
    
    @param
    self - Analyzer
    
    @return
    word_formality - list
    ''' 
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

    def _get_root_words_for_words(self, words):
        query = 'SELECT DISTINCT word, lemma FROM lemmas WHERE word IN (' + \
            ','.join(['\'%s\'' % w for w in words]) + ');'
        self.cursor.execute(query)

        root_word_rows = self.cursor.fetchall()
        root_words = {}
        
        for row in root_word_rows:
            root_words[row['word']] = row['lemma']

        for word in words:
            if word not in root_words:
                root_words[word] = word
    
        return root_words
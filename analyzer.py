import re
import pymysql

class Analyzer:
    def __init__(self, writing):
        self.writing = writing

        self.connection = pymysql.connect(host='ws-db.cxn6r23mlloe.us-east-1.rds.amazonaws.com', user='ws_root', password='NIlmodOjvetikc2', db='corpus')
        self.cursor = self.connection.cursor(pymysql.cursors.DictCursor)
    
    def analyze(self):
        word_formality = self._get_formality_for_words()

        informal_words = []
        word_tokens = self.writing.split()

        for index, wtok in enumerate(word_tokens):
            word = re.sub(r'([^\w])+|(\d)+', '', wtok).lower()
            
            if word in word_formality and word_formality[word] < 0.33:
                informal_words.append((index, word))
        
        suggestions = []
        for index, informal_word in informal_words:
            suggestion = self._get_suggestions_for_word(informal_word, index)
            suggestions.append(suggestion)

        print(suggestions)
        return suggestions

    def _get_suggestions_for_word(self, word, index):
        get_headword_query = 'SELECT headword FROM corpus.thesaurus WHERE word=\'%s\'' % word
        self.cursor.execute(get_headword_query)
        
        result = self.cursor.fetchone()
        if result is None:
            return []

        headword = result['headword']
        get_word_suggestions_query = 'SELECT word FROM corpus.thesaurus WHERE headword=\'%s\'' % headword
        self.cursor.execute(get_word_suggestions_query)

        result_word_rows = self.cursor.fetchmany(size=5)
        if result_word_rows is None:
            return []

        suggestion = {
            'index': index,
            'type': 'informal',
            'replaceWords': []
        }
        for row in result_word_rows:
            suggestion['replaceWords'].append(row['word'])

        return suggestion
        

    def _get_formality_for_words(self):
        words = re.sub(r'([^\w])+|(\d)+', ' ', self.writing).split()
        word_list = ', '.join(["'%s'" % w.lower() for w in words])
    
        query = 'SELECT regWord, formalityScore FROM words WHERE regWord IN (%s);' % word_list
        self.cursor.execute(query)

        word_formality_rows = self.cursor.fetchall()
        word_formality = {}

        for row in word_formality_rows:
            word_formality[row['regWord']] = row['formalityScore']

        return word_formality

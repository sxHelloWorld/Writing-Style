'''
Writing Style Web App Release 1
Author: Donald Diep
Last Updated: March 21, 2019

This AnalyzerPOC.py file was a modified version of the original analyzer.py to take advantage of cProfiling for performance testing. The credentials
have been redacted and thus if you're doing this at a later date, you will need to fill in some things for the cnonection yourself as well as provide certain text files.
This is simply a proof of concept. 

'''

import re
import pymysql
import csv
import cProfile
import pstats
import io

'''
Class representing the analyzer that when given the text will try to grab the informal words and  get suggestions for it. 
'''
class Analyzer:

    '''
    Creates instance of Analyzer

    @params
    self - Analyzer
    writing - String
    '''
    def __init__(self, writing):
        self.writing = writing

        self.connection = pymysql.connect(host='', user='ws_root', password='', db='')
        self.cursor = self.connection.cursor(pymysql.cursors.DictCursor)

    '''
    Returns a list of words from the associated file.

    @param
    self - Analyzer

    @return
    informal_words_list - list
    '''   
    def get_informal_words(self):
        file = "top3000_informal_words.csv"
        informal_word_list = []
        with open(file, encoding="utf-8") as f:
            for row in f:
                informal_word_list.append(row.split(",")[0])
        return(informal_word_list)

    '''
    Returns a list of suggested words 

    @param
    self - Analyzer

    @return
    suggestions - list
    '''    
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

    '''
    Returns a list of words from the associated file.

    @param
    self - Analyzer
    word - string representing the word we're looking for a suggestion of
    index - int representing the index of the suggestion

    @return
    suggestion - list of suggestions
    '''   
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
        

    '''
    Returns a value representing the formality of a given word

    @param
    self - Analyzer

    @return
    word_formality - dict
    '''   
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

    '''
    This method is an example way of utilizing CProfile to record the time spent on each operation.
    This method utilizes an alternative to the analyze we were using before. 
    For further detail, lookup python documentation on how to utilize. 

    @param
    self - Analyzer

    @return
    None 
    '''   
    def testCProfile(self):
        pr = cProfile.Profile()
        pr.enable()
        self.analyze_against_set()
        pr.disable()
        s = io.StringIO()
        ps = pstats.Stats(pr, stream=s).sort_stats('tottime')
        ps.print_stats()

        with open('test100000.txt', 'w+') as f:
            f.write(s.getvalue())
        #pr.print_stats(sort='time')

    '''
    This method was a partial alternative to the original analyze method, but it would compare against a set of informal words
    as opposed to looking them up through the database. This isn't a fully fleshed out version, and is here just for testing cProfile. 

    @param
    self - Analyzer

    @return
    None 
    '''   
    def analyze_against_set(self):
        informal_words = []
        inf_words = self.get_informal_words()
        f = open("10000.txt").read()
        for word in f.split():
            if word in inf_words:
                
                informal_words.append(word)

'''
Writing Style Web App Release 1
Author: Eric Epstein
March 20, 2018

This sentenceGenerator.py file provides all functionalities for generating text based on the Gutenberg corpus
that contains words in an associated file. 
'''

'''
If there is an issue with the following import statement, run the nltk.download('gutenberg') command.
You can also try nltk.download('punkt').
'''
from nltk.corpus import gutenberg

'''
Class representing a processor to gather informal words in an associated file.
'''
class InformalWordProcessor:

    '''
    Creates instance of InformalWordProcessor

    @params
    self - InformalWordProcessor
    filename - String
    '''
    def __init__(self, filename):
        self.filename = filename

    '''
    Returns a list of words from the associated file.

    @param
    self - InformalWordProcessor

    @return
    informal_words - list
    '''
    def process_informal_words(self):
        informal_words = []
        f = open(self.filename, 'r+', encoding="utf-8")
        # Iterates through the file to gather words
        for line in f.readlines():
            informal_word = line.strip().split(",")[0]
            informal_words.append(informal_word)
        # Removes the header "regWord" from the list
        informal_words = informal_words[1:]
        return informal_words

'''
Class representing a generator to output text files with sentences containing select words
'''
class TextGenerator:

    '''
    Creates instance of TextGenerator.

    @params
    self - TextGenerator
    target_word_count - int
    '''    
    def __init__(self, target_word_count):
        self.target_word_count = target_word_count
        self.results = []

        
    '''
    Returns a list of sentences containing select words.

    @params
    self - TextGenerator
    word_list - list
    sents - list

    @return
    matching_sents - list
    '''
    def find_matching_sents(self, word_list, sents):
        matching_sents = []
        # Iterates through sentences to identify those with select words.
        for sent in sents:
            contains_word = any(word in word_lsit for word in sent)
            if contains_word:
                final_sent = " "
                for word in sent:
                    # Preprocessing step to maintain punctuation in the sentence.
                    if word in [".",",","\'",";",":","!","?","-", ")","\""] or final_sent[-1] in ["\'", "(", "-"]:
                        final_sent = final_sent + word
                    else:
                        final_sent = final_sent + " " + word
                # Postprocessing step to remove trailing whitespace at the beginning of the sentence.
                final_sent = final_sent[1:]
                matching_sents.append(final_sent)
                # Terminates function if the total length of sentences exceeds the target word count.
                if len([word for matching_sent in matching_sents for word in matching_sent]) > self.target_word_count:
                    return matching_sents
        return matching_sents


    '''
    Writes text to file or prints error statement.

    @params
    self - TextGenerator
    word_list - list
    title_list - list
    '''
    def generate_text(self, word_list, title_list):
        for text in title_list:
            matching_sents = self.find_matching_sents(word_list, gutenberg.sents(text))
            self.results.extend(matching_sents)

            actual_word_count = len("".join(self.results).split(" "))

            if actual_word_count >= self.target_word_count:
                f = open(str(self.target_word_count) + "-word_writing_sample.txt", "w+", encoding="utf-8")
                f.write("".join(self.results))
                f.close()
                print("SUCCESSFULLY WROTE TO FILE")
                break
        if actual_word_count < self. target_word_count:
            print("INSUFFICIENT WORD COUNT")
        

'''
Creates and executes InformalWordProcessor and TextGenerator
'''
def main():

    # The following list displays different text files in the Gutenberg corpus for sentence selection.
    '''
    ['austen-emma.txt', 'austen-persuasion.txt', 'austen-sense.txt', 'bible-kjv.txt',
    'blake-poems.txt', 'bryant-stories.txt', 'burgess-busterbrown.txt',
    'carroll-alice.txt', 'chesterton-ball.txt', 'chesterton-brown.txt',
    'chesterton-thursday.txt', 'edgeworth-parents.txt', 'melville-moby_dick.txt',
    'milton-paradise.txt', 'shakespeare-caesar.txt', 'shakespeare-hamlet.txt',
    'shakespeare-macbeth.txt', 'whitman-leaves.txt']
    '''
    # Creates a list of text in the Gutenberg corpus.
    texts = ['chesterton-brown.txt','chesterton-ball.txt','carroll-alice.txt','austen-persuasion.txt','austen-sense.txt','austen-emma.txt']

    # Instantiates an InformalWordProcessor object
    iwp = InformalWordProcessor("top3000_informal_words.csv")
    informal_words = iwp.process_informal_words()

    # Instantiates a TextGenerator object.
    tg = TextGenerator(100)

    # Writes results to file.
    tg.generate_text(informal_words, texts)

main()

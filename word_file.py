import os

class WordFile:
    def __init__(self, filepath):
        self._read_word_file(filepath)

    def _read_word_file(self, filepath):
        self.words = {}
        with open(filepath, 'r') as word_file:
            for line in word_file:
                line_components = line.split(';')
                if len(line_components) != 2:
                    raise IOError()

                word = line_components[0]
                headwords = line_components[1].split(',')

                self.words[word] = [h.strip() for h in headwords]

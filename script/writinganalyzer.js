function WritingAnalyzer(text) {
    this.text = text;
    this.htmlContent = '';
    this.repeatedWords = [];
    this.informalWords = [];

    this.specifiedSuggestions = [
        {
            index: 11,
            type: 'repeated',
            replaceWord: 'hardware'
        },
        {
            index: 29,
            type: 'informal',
            replaceWord: 'several'
        },
        {
            index: 30,
            type: 'informal',
            replaceWord: 'products'
        },
        {
            index: 39,
            type: 'informal',
            replaceWord: 'professional'
        },
        {
            index: 68,
            type: 'repeated',
            replaceWord: 'so'
        },
        {
            index: 93,
            type: 'repeated',
            replaceWord: 'larger'
        },
        {
            index: 117,
            type: 'repeated',
            replaceWord: 'nicer'
        },
        {
            index: 122,
            type: 'informal',
            replaceWord: 'wonderful'
        },
    ];
}

WritingAnalyzer.prototype.removeWord = function(wordId) {
    var repeatedWordObjIndex = this.repeatedWords.findIndex(function (word) {
        return word.id === wordId;
    });
    if (repeatedWordObjIndex !== -1) {
        this.repeatedWords.splice(repeatedWordObjIndex, 1);
    }

    var informalWordObjIndex = this.informalWords.findIndex(function (word) {
        return word.id === wordId;
    });
    if (informalWordObjIndex !== -1) {
        this.informalWords.splice(informalWordObjIndex, 1);
    }
};

WritingAnalyzer.prototype.getEditorHtml = function() {
    return this.htmlContent;
};

WritingAnalyzer.prototype.addReplaceWord = function(wordIndex, newWord) {
    this.replaceWords[wordIndex] = newWord;
}

WritingAnalyzer.prototype._getHtmlForWord = function(word, wordIndex) {
    if (this.specifiedSuggestions) {
        // check if there's a specified suggestion for the current word
        let suggestionForCurrentWord = this.specifiedSuggestions.find(function (suggestion) {
            return suggestion.index === wordIndex;
        });

        if (suggestionForCurrentWord) {
            let suggestion = { 
                word: word.trim(),
                id: word.trim() + wordIndex
            };
            if (suggestionForCurrentWord.type === 'informal') {
                this.informalWords.push(suggestion);
            } else if (suggestionForCurrentWord.type === 'repeated') {
                this.repeatedWords.push(suggestion);
            }

            return this._getSuggestionHtml(word.trim(), word.trim() + wordIndex, suggestionForCurrentWord.type, 
                suggestionForCurrentWord.replaceWord);
        } else {
            return this._getWordHtml(word.trim(), word.trim() + wordIndex);
        }
    } else {
        // for simplicity only suggest changes to words that don't contain numbers or punctuation
        // and decide if this word should have a suggestion
        if (word.match(/^\w+$/g) && Math.random() < 0.05) {
            // decide if this word should be informal or repeated
            if (Math.random() < 0.5) {
                var suggestionType = 'repeated';
                this.repeatedWords.push({
                    word: word.trim(),
                    id: word + wordIndex
                });
            } else {
                var suggestionType = 'informal';
                this.informalWords.push({
                    word: word.trim(),
                    id: word.trim() + wordIndex
                });
            }
            return this._getSuggestionHtml(word.trim(), word.trim() + wordIndex, suggestionType, '');
        } else {
            return this._getWordHtml(word.trim(), word.trim() + wordIndex);
        }
    }
}

WritingAnalyzer.prototype.randomlyAnalyze = function() {
    let paragraphs = this.text.split(/\t|\n\n/);
    this.htmlContent = '';

    let wordIndex = 0;
    for (let paragraph of paragraphs) {
        let words = paragraph.split(' ');

        this.htmlContent += '<div class="suggestion-paragraph">';
        for (let word of words) {
            this.htmlContent += this._getHtmlForWord(word, wordIndex);
            wordIndex++;
        }
        this.htmlContent += '</div>'
    }
};

WritingAnalyzer.prototype._getSuggestionHtml = function(word, wordId, type, replaceWord, suggestionMessage) {
    let typeTitle = type[0].toUpperCase() + type.substr(1); 

    if (type === 'informal') {
        var suggestionMessage = `This word is informal. A much better word would be <i>${replaceWord}</i>, it's more professional.`;
    } else {
        var suggestionMessage = `This word has been used too often in your writing. Consider changing ${word} to <i>${replaceWord}</i>.`;
    }

    const suggestionTemplate = `
        <a class="highlight-anchor" id="${wordId}"></a>
        <span class="highlight highlight-${type}-word span-word" id="${wordId}-word">${word}</span>
        <div class="highlight-suggestion highlight-suggestion-${type}-word">
            <div class="highlight-suggestion-title highlight-suggestion-title-${type}-word">${typeTitle}</div>
            <div class="highlight-suggestion-content">${suggestionMessage}</div>
            <button class="btn btn-primary highlight-btn-replace highlight-btn-replace-${type}" data-replace-word="${replaceWord}" data-word-id="${wordId}">Replace Word</button>
        </div>
    `;

    return suggestionTemplate;
};

WritingAnalyzer.prototype._getWordHtml = function(word, wordId) {
    return `<span class="span-word" id="${wordId}-word">${word} </span>`;
};

WritingAnalyzer.prototype.getRepeatedWordsHtml = function() {
    return this._getListHtml(this.repeatedWords, 'repeated');
}

WritingAnalyzer.prototype.getInformalWordsHtml = function() {
    return this._getListHtml(this.informalWords, 'informal');
}

WritingAnalyzer.prototype._getListHtml = function(words, type) {
    let listHtml = '<ul class="list-group">';
    for (let word of words) {
        listHtml += `<a id="${word.id}-list-item" href="#${word.id}" class="suggestion-anchor-link suggestion-link-${type}"><li class="list-group-item list-group-item-suggestion">${word.word}</li></a>`;
    }
    listHtml += '</ul>';

    return listHtml;
};
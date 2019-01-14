function WritingAnalyzer(text) {
    this.text = text;
    this.htmlContent = '';
    this.repeatedWords = [];
    this.informalWords = [];

    this.specifiedSuggestions = [
        {
            index: 11,
            type: 'repeated',
            replaceWords: ['hardware', 'products', 'phones']
        },
        {
            index: 29,
            type: 'informal',
            replaceWords: ['several', 'many']
        },
        {
            index: 30,
            type: 'informal',
            replaceWords: ['products', 'items']
        },
        {
            index: 39,
            type: 'informal',
            replaceWords: ['professional', 'high-end', 'sleek']
        },
        {
            index: 68,
            type: 'repeated',
            replaceWords: ['so', 'a lot']
        },
        {
            index: 93,
            type: 'repeated',
            replaceWords: ['larger', 'wider']
        },
        {
            index: 117,
            type: 'repeated',
            replaceWords: ['nicer', 'fancier']
        },
        {
            index: 122,
            type: 'informal',
            replaceWords: ['wonderful', 'amazing', 'futuristic']
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

WritingAnalyzer.prototype.getSummary = function() {
    let summary = 'Writing Style Analysis\n\n';

    summary += 'Repeated Words\n';
    for (let repeatedWord of this.repeatedWords) {
        summary += repeatedWord.word + '\t->\t' + repeatedWord.suggestion.replaceWords.join(', ') + '\n';
    }
    summary += '\n';

    summary += 'Informal Words\n';
    for (let informalWord of this.informalWords) {
        summary += informalWord.word + '\t->\t' + informalWord.suggestion.replaceWords.join(', ') + '\n';
    }

    summary += '\n';
    return summary;
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
                id: word.trim() + wordIndex,
                suggestion: suggestionForCurrentWord
            };
            if (suggestionForCurrentWord.type === 'informal') {
                this.informalWords.push(suggestion);
            } else if (suggestionForCurrentWord.type === 'repeated') {
                this.repeatedWords.push(suggestion);
            }

            return this._getSuggestionHtml(word.trim(), word.trim() + wordIndex, suggestionForCurrentWord.type, 
                suggestionForCurrentWord.replaceWords);
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

WritingAnalyzer.prototype._getSuggestionHtml = function(word, wordId, type, replaceWords, suggestionMessage) {
    let typeTitle = type[0].toUpperCase() + type.substr(1); 

    if (type === 'informal') {
        var suggestionMessage = '<p class="text-center highlight-suggestion-label highlight-suggestion-label-informal">Informal Word</p>';
    } else {
        var suggestionMessage = '<p class="text-center highlight-suggestion-label highlight-suggestion-label-repeated">Repeated Word</p>';
    }

    let suggestionTemplate = `
        <a class="highlight-anchor" id="${wordId}"></a>
        <span class="highlight highlight-${type}-word span-word" id="${wordId}-word">${word}</span>
        <div class="highlight-suggestion highlight-suggestion-${type}-word">
            <button class="btn btn-primary highlight-btn-replace highlight-btn-replace-ignore highlight-btn-replace-ignore-${type}" data-replace-word="!!IGNORE!!" data-word-id="${wordId}">Ignore Suggestion</button>
        `;
    for (let replaceWord of replaceWords) {
        let buttonHtml = `<button class="btn btn-primary highlight-btn-replace highlight-btn-replace-${type}" data-replace-word="${replaceWord}" data-word-id="${wordId}">${replaceWord}</button>`;
        suggestionTemplate += buttonHtml;
    }
    suggestionTemplate += `
        ${suggestionMessage}
    `;
    suggestionTemplate += '</div>';

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
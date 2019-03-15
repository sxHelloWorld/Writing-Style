function WritingAnalyzer(text) {
    this.text = text;
    this.htmlContent = '';
    this.repeatedWords = [];
    this.informalWords = [];
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
    /*
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
    return summary;*/
    return 'fix me';
}

WritingAnalyzer.prototype._cleanWord = function(word) {
    return word.trim().replace(/[^\w\d]/, '');
}

WritingAnalyzer.prototype._getHtmlForWord = function(word, wordIndex) {
    let cleanedWord = this._cleanWord(word);
    if (this.specifiedSuggestions) {
        // check if there's a specified suggestion for the current word
        let suggestionForCurrentWord = this.specifiedSuggestions.find(function (suggestion) {
            return suggestion.index === wordIndex;
        });

        if (suggestionForCurrentWord) {
            let suggestion = { 
                word: cleanedWord,
                id: cleanedWord + wordIndex,
                suggestion: suggestionForCurrentWord
            };
            if (suggestionForCurrentWord.type === 'informal') {
                this.informalWords.push(suggestion);
            } else if (suggestionForCurrentWord.type === 'repeated') {
                this.repeatedWords.push(suggestion);
            }

            return this._getSuggestionHtml(word, cleanedWord + wordIndex, suggestionForCurrentWord.type, 
                suggestionForCurrentWord.replaceWords);
        } else {
            return this._getWordHtml(word, cleanedWord + wordIndex);
        }
    } 
}

WritingAnalyzer.prototype.analyze = function(done) {
    $.ajax({
        url: '/analyze',
        type: 'POST',
        data: this.text,
        contentType: 'text/html'
    }).done(function (data) {
        this.specifiedSuggestions = JSON.parse(data);
        this._getHtmlForAllText();

        done(this.htmlContent);
    }.bind(this)).fail(function(error) {
        this.specifiedSuggestions = [];
        this._getHtmlForAllText();

        done(this.htmlContent);
    }.bind(this));
}

WritingAnalyzer.prototype._getHtmlForAllText = function() {
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
}

WritingAnalyzer.prototype._getTitle = function(word) {
    return word[0].toUpperCase() + word.substring(1).toLowerCase();
}

WritingAnalyzer.prototype._getWordSuggestionsHtml = function(wordId, type, words) {
    var html = '';
    for (let replaceWord of words) {
        let buttonHtml = `<button class="btn btn-primary highlight-btn-replace highlight-btn-replace-${type}" data-replace-word="${replaceWord}" data-word-id="${wordId}">${replaceWord}</button>`;
        html += buttonHtml;
    }

    return html;
}

WritingAnalyzer.prototype._getSuggestionHtml = function(word, wordId, type, replaceWords) {
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

    if (Object.keys(replaceWords).length > 1) {
        
        // add the html for the tabs
        suggestionTemplate += `
            <div class="ws-tabs">
                <ul class="ws-tab-list ws-tab-list-${type}">
            `;
        let tabNumber = 1;
        for (headword in replaceWords) {
            let headwordTitle = this._getTitle(headword);
            suggestionTemplate += `<li class="ws-tab-item ws-tab-item-${type}" id="ws-tab-item-${tabNumber}">${headwordTitle}</li>`;
            tabNumber++;
        }
        suggestionTemplate += `</ul>`;

        // add the html for the tab contents
        let tabContentNumber = 1;
        for (headword in replaceWords) {
            let replaceWordList = replaceWords[headword];
            suggestionTemplate += `
            <div class="ws-tab-content" id="ws-tab-content-${tabContentNumber}">
                ${this._getWordSuggestionsHtml(wordId, type, replaceWordList)}
            </div>
            `;

            tabContentNumber++;
        }
        suggestionTemplate += '</div>'; // closes .ws-tabs
    } else {
        let replaceWordList = replaceWords[Object.keys(replaceWords)[0]];
        suggestionTemplate += this._getWordSuggestionsHtml(wordId, type, replaceWordList);
    }

    suggestionTemplate += `
        ${suggestionMessage}
    `;
    suggestionTemplate += '</div>'; // closes .highlight-suggestion

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
        listHtml += `<a id="${word.id}-list-item" href="#${word.id}" class="suggestion-anchor-link suggestion-link-${type}">
                        <li class="list-group-item list-group-item-suggestion">
                            <span>${word.word}</span>
                            <span class="list-group-item-suggetion-jumpto">jump to ↵</span>
                        </li>
                    </a>`;
    }
    listHtml += '</ul>';

    return listHtml;
};
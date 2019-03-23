/*
Writing Style Web App Release 1
Author: Adam Spindler
Last Updated: March 16, 2019

*/

/**
 * Constructor for a new instance of the WritingAnalyzer object
 * 
 * @param {string} text The text to analyze
 */
function WritingAnalyzer(text) {
    this.text = text;
    this.htmlContent = '';
    this.repeatedWords = [];
    this.informalWords = [];
}

/**
 * Remove suggestions from a word, used to ignore a suggestion for
 * particular word.
 */
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

/**
 * Get the HTML that displays the analyzed text.
 */
WritingAnalyzer.prototype.getEditorHtml = function() {
    return this.htmlContent;
};

/**
 * Get text for the summary text file for a list of suggestions.
 */
WritingAnalyzer.prototype._getSummaryForSuggestionList = function(suggList) {
    let summary = '';
    for (let improperWord of suggList) {
        summary += improperWord.word + '\t->\t';

        for (let headWord in improperWord.suggestion.replaceWords) {
            let synonyms = improperWord.suggestion.replaceWords[headWord].join(', ');
            summary += `${headWord}: ${synonyms}\n\t\t`;
        }
        summary += '\n';
    }

    return summary;
}

/**
 * Get the text content of the summary file which contains an overview
 * of all the suggestions that the analyzer made.
 */
WritingAnalyzer.prototype.getSummary = function() {
    let summary = 'Writing Style Analysis\n\n';

    summary += 'Repeated Words\n';
    summary += this._getSummaryForSuggestionList(this.repeatedWords);
    summary += '\n';

    summary += 'Informal Words\n';
    summary += this._getSummaryForSuggestionList(this.informalWords);
    summary += '\n';

    return summary;
}

/**
 * Remove any punctuation from a word.
 */
WritingAnalyzer.prototype._cleanWord = function(word) {
    return word.trim().replace(/[^\w\d]/, '');
}

/**
 * Get the HTML for a single word. If it doesn't have any suggestions
 * it will just be wrapped in a span, if it does have suggestions then
 * it will be wrapped in a span with the appropriate color underline
 * and there will also be a hidden div for the suggestion popover.
 */
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

/**
 * Analyze all of the text, takes a callback function which will be 
 * passed the HTML with the suggestions embedded.
 */
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

/**
 * Determine the HTML content to display all of the text with the 
 * suggestions.
 */
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

/**
 * Make the first letter of the string uppercase and the rest lowercase.
 */
WritingAnalyzer.prototype._getTitle = function(word) {
    return word[0].toUpperCase() + word.substring(1).toLowerCase();
}

/**
 * Get the HTML to be displayed in the popover for each of the suggested 
 * replace words.
 */
WritingAnalyzer.prototype._getWordSuggestionsHtml = function(wordId, type, words) {
    var html = '';
    for (let replaceWord of words) {
        let buttonHtml = `<button class="btn btn-primary highlight-btn-replace highlight-btn-replace-${type}" data-replace-word="${replaceWord}" data-word-id="${wordId}">${replaceWord}</button>`;
        html += buttonHtml;
    }

    return html;
}

/**
 * Get the HTML for the suggestion popover for a single word.
 */
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

/**
 * Get the HTML for the span to wrap a word with no suggestions.
 */
WritingAnalyzer.prototype._getWordHtml = function(word, wordId) {
    return `<span class="span-word" id="${wordId}-word">${word} </span>`;
};

/**
 * Get the HTML for the list of repeated words displayed on the
 * right side of the screen.
 */
WritingAnalyzer.prototype.getRepeatedWordsHtml = function() {
    return this._getListHtml(this.repeatedWords, 'repeated');
}

/**
 * Get the HTML for the list of informal words displayed on the
 * right side of the screen.
 */
WritingAnalyzer.prototype.getInformalWordsHtml = function() {
    return this._getListHtml(this.informalWords, 'informal');
}

/**
 * Get the HTML for the list of either repeated or informal words
 * displayed on the right side of the screen.
 */
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
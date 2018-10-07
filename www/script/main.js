function updateDisplaySuggestionCounts(analyzer) {
    $('#titleinformalWords').text(`[${analyzer.informalWords.length}] Informal Words`);
    $('#titleRepeatedWords').text(`[${analyzer.repeatedWords.length}] Repeated Words`);

    let totalIssueCount = analyzer.informalWords.length + analyzer.repeatedWords.length;
    $('#titleIssueWords').text(`${totalIssueCount} Issues`)
}

// modified from: https://stackoverflow.com/a/5670825
function getSelectionHtml() {
    var html = "";
    var range = new Range();
    var parentElement = null;

    if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            parentElement = sel.focusNode.parentElement;
            range = sel.getRangeAt(0);

            var container = document.createElement("div");
            container.appendChild(range.cloneContents());
            html = container.innerHTML;
        }
    } else if (typeof document.selection != "undefined") {
        if (document.selection.type == "Text") {
            range = document.selection.createRange();
            html = range.htmlText;
        }
    }
    return {
        text: html,
        range: range,
        parentElement: parentElement
    };
}

function getWordIndexFromLetterIndex(text, letterIndex) {
    let words = text.split(' ');

    let letterCounts = 0;
    let wordCount = 0;

    for (let word of words) {
        // add 1 for the space
        letterCounts += word.length + 1;
        if (letterCounts > letterIndex) {
            return wordCount;
        }

        wordCount++;
    }

    return -1;
}

$(document).ready(function() {
    var replacingWord = false;
    var selectedWordInfo = undefined;

    $('#analyze-button').on('click', function() {
        window.scrollTo(0, 0);
        $('#submission-container').css('display', 'none');
        $('#review-container').css('display', 'block');

        let textToAnalyze = $('.content-input').val();
        let analyzer = new WritingAnalyzer(textToAnalyze);
        analyzer.randomlyAnalyze();

        $('#editor').html(analyzer.getEditorHtml());
        $('#informalWordsCard').html(analyzer.getInformalWordsHtml());
        $('#repeatedWordsCard').html(analyzer.getRepeatedWordsHtml());

        updateDisplaySuggestionCounts(analyzer);

        $('.highlight').on('mouseleave', function(e) {
            $(e.currentTarget).data('mouseover', false);
        });

        $('.highlight').on('mouseenter', function(e) {
            if (!$(e.currentTarget).hasClass('highlight') || $(e.currentTarget).next('.highlight-suggestion').is(':animated') 
                || replacingWord ) {

                return;
            }
            $(e.currentTarget).data('mouseover', true);

            setTimeout(function() {
                // if the cursor isn't still over the word, then don't display the issue dialog
                if (!$(e.currentTarget).data('mouseover')) {
                    return;
                }

                var wordOffset = $(e.currentTarget).offset();
                var left = wordOffset.left + "px";
                var top = (wordOffset.top - $(document).scrollTop()) + "px";
                
                var $suggestionBox = $(e.currentTarget).next('.highlight-suggestion');
                $suggestionBox.toggle('fold');

                $suggestionBox.css('left', left);
                $suggestionBox.css('top', top);
            }, 400);
        });


        $('.highlight-suggestion').on('mouseenter', function(e) {
            $(e.currentTarget).data('mouseover', true);
        });

        // handle closing the suggestion popover when the user moves their mouse off it
        $('.highlight-suggestion').on('mouseleave', function(e) {
            $(e.currentTarget).data('mouseover', false);
            if (replacingWord) {
                replacingWord = false;
                return;
            }

            // delay to give the user an opportunity to bring their cursor back over the popover
            setTimeout(function() {
                if (!$(e.currentTarget).data('mouseover')) {
                    $(e.currentTarget).toggle('fold');
                    selectedWordInfo = undefined;
                }
            }, 300);
        });

        // handle jumping to a word when pressing the link
        $('.suggestion-anchor-link').on('click', function(e) {
            let wordId = e.currentTarget.getAttribute('href').replace('#', '');
            $('#' + wordId + '-word').animateCss('heartBeat');
        });

        // handle changing the chevron direction when folding/unfolding the accordian
        $('.card-header-suggestion').on('click', function(e) {
            let $chevron = $(e.currentTarget).find('.chevron');
            if ($chevron.hasClass('fa-chevron-up')) {
                $chevron.removeClass('fa-chevron-up');
                $chevron.addClass('fa-chevron-down');
            } else if ($chevron.hasClass('fa-chevron-down')) {
                $chevron.removeClass('fa-chevron-down');
                $chevron.addClass('fa-chevron-up');
            }
        });

        // handle when the user replaces a word
        $('.highlight-btn-replace').on('click', function(e) {
            var wordId = $(e.currentTarget).attr('data-word-id');
            var wordToReplaceWith = $(e.currentTarget).attr('data-replace-word');

            $('#' + wordId + '-word').removeClass('highlight highlight-informal-word highlight-repeated-word');
            $('#' + wordId + '-word').text(wordToReplaceWith);

            replacingWord = true;
            $(e.currentTarget).closest('.highlight-suggestion').toggle('fold');

            $('#' + wordId + '-list-item').slideUp();

            // remove the replaced word from the analyzer
            analyzer.removeWord(wordId);

            updateDisplaySuggestionCounts(analyzer);
        });

        // handle when the user clicks on a requested word to replace with
        $('.list-group-item-suggestion-repeated').on('click', function(event) {
            if (selectedWordInfo) {
                // add a period if the original word had it
                let replaceWord = $(event.currentTarget).text();
                let originalText = $(selectedWordInfo.parentElement).text();

                if (originalText.indexOf('.') !== -1) {
                    replaceWord += '.';
                }

                $(selectedWordInfo.parentElement).text(replaceWord + ' ');
                selectedWordInfo = undefined;
            }

            replacingWord = true;
            $('#highlight-suggestion-requested').toggle('fold');
        });

        // handle when the user double clicks a word to bring up the requested word popover
        $('.span-word').on('dblclick', function(event) {
            if ($(event.currentTarget).hasClass('highlight')) {
                return;
            }

            selectedWordInfo = getSelectionHtml();
            let highlightedContent = selectedWordInfo.text;
            if (highlightedContent.match(/^\w+$/g)) {
                let cursorX = event.clientX;
                let cursorY = event.clientY;

                let popoverSuggestionX = (cursorX - 10) + 'px';
                let popoverSuggestionY = (cursorY - 10) + 'px';

                $('#highlight-suggestion-requested').css('left', popoverSuggestionX);
                $('#highlight-suggestion-requested').css('top', popoverSuggestionY);

                $('#highlight-suggestion-requested').toggle('fold');
            }
        });
    });
});
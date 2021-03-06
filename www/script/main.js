/**
 * Update the number of informal and repeated words displayed in the UI.
 * 
 * @param {WritingAnalyzer} analyzer The WritingAnalyzer object
 */
function updateDisplaySuggestionCounts(analyzer) {
    $('#titleinformalWords').text(`[${analyzer.informalWords.length}] Informal Words`);
    $('#titleRepeatedWords').text(`[${analyzer.repeatedWords.length}] Repeated Words`);

    let totalIssueCount = analyzer.informalWords.length + analyzer.repeatedWords.length;
    $('#titleIssueWords').text(`${totalIssueCount} Issues`)
}

/**
 * Get the HTML that is currently selected by the user.
 */
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

/**
 * Boolean indicating if this is the first time that the writing sample
 * has been analyzed.
 */
var firstTime = true;

/**
 * Wait until the DOM has loaded
 */
$(document).ready(function() {
    var replacingWord = false;
    var selectedWordInfo = undefined;

    /**
     * Called when the user presses the back button to go back to the 
     * text input page.
     */
    $('#back-button').on('click', function() {
        window.scrollTo(0, 0);

        // collapse the suggestion lists and make the chevrons point
        // in the correct direction
        $('.collapse-suggestions').collapse('hide');
        $('.chevron').removeClass('fa-chevron-up');
        $('.chevron').addClass('fa-chevron-down');

        $('#submission-container').css('display', 'block');
        $('#review-container').css('display', 'none');

        // remove all event handlers from the element
        $('.highlight-suggestion').off();
    });

    /**
     * Called when the user presses the analyze button
     */
    $('#analyze-button').on('click', function() {
        window.scrollTo(0, 0);
        $('#submission-container').css('display', 'none');
        $('#review-container').css('display', 'block');

        let textToAnalyze = $('.content-input').val();
        let analyzer = new WritingAnalyzer(textToAnalyze);

        /**
         * Called when the server responds with the analysis result
         */
        analyzer.analyze(function() {
            $('#editor').html(analyzer.getEditorHtml());
            $('#informalWordsCard').html(analyzer.getInformalWordsHtml());
            $('#repeatedWordsCard').html(analyzer.getRepeatedWordsHtml());

            updateDisplaySuggestionCounts(analyzer);

            let summaryUrl = 'data:application/octet-stream;charset=utf-8;base64,' + btoa(analyzer.getSummary());
            $('#btn-summary').attr('href', summaryUrl);

            /**
             * Called when the user moves their cursor off a word with
             * suggestions.
             */
            $('.highlight').on('mouseleave', function(e) {
                $(e.currentTarget).data('mouseover', false);
                
                var $suggestionBox = $(e.currentTarget).next('.highlight-suggestion');
                handleClosingHighlightSuggestion($suggestionBox);
            });

            /**
             * Called when the user brings their mouse over over a word
             * with suggestions.
             */
            $('.highlight').on('mouseenter', function(e) {
                var $suggestionBox = $(e.currentTarget).next('.highlight-suggestion');
                if (!$(e.currentTarget).hasClass('highlight') || $suggestionBox.is(':animated')
                    || replacingWord || $suggestionBox.data('recentlyClosedPopover')) {

                    return;
                }
                $(e.currentTarget).data('mouseover', true);

                setTimeout(function() {
                    // if the cursor isn't still over the word, then don't display the issue dialog
                    // or if the user recently dismissed the popover then don't immediately show it
                    // again because they may have just moused over
                    if (!$(e.currentTarget).data('mouseover') || $suggestionBox.data('recentlyClosedPopover')) {
                        return;
                    }

                    var wordOffset = $(e.currentTarget).offset();
                    var left = (wordOffset.left) + "px";

                    // the minus 2 is for the border height of the word, it's the underline
                    var top = (wordOffset.top + $(e.currentTarget).outerHeight() - 2 - $(document).scrollTop()) + "px";
                    
                    // show indication in the right panel of the word selected
                    $("#" + $(e.currentTarget).attr('id').replace('-word', '') + "-list-item").closest('.collapse-suggestions').collapse('show');
                    $("#" + $(e.currentTarget).attr('id').replace('-word', '') + "-list-item").animateCss('rubberBand');

                    // hide all of the suggestion boxes already visible, only allow one at a time
                    $('.highlight-suggestion').hide('fold');

                    $suggestionBox.data('mouseover', true);
                    $suggestionBox.toggle('fold');

                    $suggestionBox.css('left', left);
                    $suggestionBox.css('top', top);
                }, 400);
            });


            /**
             * Called when the user brings their cusor over the suggestion
             * popover.
             */
            $('.highlight-suggestion').on('mouseenter', function(e) {
                $(e.currentTarget).data('mouseover', true);
            });

            /**
             * Called when the user moves their mouse off the suggestion
             * popover to hide it.
             */ 
            $('.highlight-suggestion').on('mouseleave', function(e) {
                handleClosingHighlightSuggestion($(e.currentTarget));
            });

            /**
             * Close the suggestion popover if the user has their cusor off it
             * for more than 300ms.
             * @param {jQuery popover object} $suggestionBox 
             */
            function handleClosingHighlightSuggestion($suggestionBox) {
                $suggestionBox.data('mouseover', false);
                if (replacingWord) {
                    replacingWord = false;
                    return;
                }

                // delay to give the user an opportunity to bring their cursor back over the popover
                $suggestionBox.data('recentlyClosedPopover', true);
                setTimeout(function() {
                    if (!$suggestionBox.data('mouseover')) {
                        $suggestionBox.hide('fold');
                        selectedWordInfo = undefined;

                        setTimeout(function() {
                            $suggestionBox.data('recentlyClosedPopover', false);
                        }, 300);
                    } else {
                        $suggestionBox.data('recentlyClosedPopover', false);
                    }
                }, 300);
            }

            /**
             * Called when a user clicks on a word in the panel on the
             * right, they will be scrolled down to the word and it will pulse.
             */
            $('.suggestion-anchor-link').on('click', function(e) {
                let wordId = e.currentTarget.getAttribute('href').replace('#', '');
                $('#' + wordId + '-word').animateCss('heartBeat');
            });

            /**
             * Called when the user selects a word in the suggestion popover to
             * replace the word that has an issue with it.
             */
            $('.highlight-btn-replace').on('click', function(e) {
                var wordId = $(e.currentTarget).attr('data-word-id');
                var wordToReplaceWith = $(e.currentTarget).attr('data-replace-word');

                $('#' + wordId + '-word').removeClass('highlight highlight-informal-word highlight-repeated-word');
                if (wordToReplaceWith !== '!!IGNORE!!') {
                    $('#' + wordId + '-word').text(wordToReplaceWith);
                }

                replacingWord = true;
                $(e.currentTarget).closest('.highlight-suggestion').toggle('fold');

                $('#' + wordId + '-list-item').slideUp();

                // remove the replaced word from the analyzer
                analyzer.removeWord(wordId);

                updateDisplaySuggestionCounts(analyzer);
            });

            /**
             * Called when a user clicks on a tab in the suggestion popover.
             * Note: tabs only appear if there are multiple definitions for
             * the word used in the writing sample.
             */
            $('.ws-tab-item').on('click', function(event) {
                let $tabItem = $(event.target);
                let $tabContainer = $tabItem.closest('.ws-tabs');

                let tabId = $tabItem.attr('id');

                let tabIdComponents = tabId.split('-');
                let tabNumberStr = tabIdComponents[tabIdComponents.length - 1];

                let tabContentIdToShow = 'ws-tab-content-' + tabNumberStr;
                
                // hide all of the tab content, then only show the tab selected
                $tabContainer.find('.ws-tab-content').css('display', 'none');
                $tabContainer.find('#' + tabContentIdToShow).css('display', 'block');

                // make the selected tab item have a white background and make all the
                // others that aren't selected colored
                $tabContainer.find('.ws-tab-item-informal').css('background', 'var(--color-informal-word-light');
                $tabContainer.find('.ws-tab-item-repeated').css('background', 'var(--color-repeated-word-light');
                $tabItem.css('background', 'white');
            });

            if (firstTime) {
                firstTime = false;
                
                /**
                 * Called when the user expands or contracts a section on the 
                 * panel on the right. Change the chevron to point in the right
                 * direction depending on if it's being opened or closed.
                 */
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

                /**
                 * Called when a user clicks on a repeated word to replace.
                 */
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
            }

            /**
             * Handle when a user double clicks on a word to bring up a list of
             * synonyms.
             */
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
});
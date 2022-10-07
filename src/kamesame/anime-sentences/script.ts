// ==UserScript==
// @name         KameSame Anime Sentences
// @description  Adds example sentences from anime movies and shows for vocabulary from immersionkit.com
// @version      0.1
// @author       Timberpile
// @namespace    ksanimesentences

// @match        http*://www.kamesame.com/app/reviews/study/*
// @match        http*://www.kamesame.com/app/items/*

// @copyright    2022+, Paul Connolly, Timberpile
// @license      MIT; http://opensource.org/licenses/MIT
// @run-at       document-end
// @grant        none
// ==/UserScript==

// These lines are necessary to make sure that TSC does not put any exports in the
// compiled js, which causes the script to crash
// eslint-disable-next-line no-var, @typescript-eslint/no-unused-vars
var module = {}
export = null

import { KSOF } from '../types/ksof'
import { AS } from './types'

declare global {
    interface Window {
        //eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ksof: KSOF.Core.Module & KSOF.Settings.Module
        $: JQueryStatic
    }
}

(() => {

    //--------------------------------------------------------------------------------------------------------------//
    //-----------------------------------------------INITIALIZATION-------------------------------------------------//
    //--------------------------------------------------------------------------------------------------------------//

    const { ksof } = window

    const scriptId = 'anime-sentences';
    const scriptName = 'Anime Sentences';

    class Settings implements AS.Settings {
        playbackRate: number
        showEnglish: 'always' | 'onhover' | 'onclick'
        showJapanese: 'always' | 'onhover' | 'onclick'
        showFurigana: 'always' | 'onhover' | 'never'
        sentenceLengthSort: 'asc' | 'desc'
        filterWaniKaniLevel: boolean
        filterAnimeShows: AS.ShowFilter
        filterAnimeMovies: AS.ShowFilter
        filterGhibli: AS.ShowFilter

        constructor() {
            this.playbackRate = 0.75
            this.showEnglish = 'onhover'
            this.showJapanese = 'always'
            this.showFurigana = 'onhover'
            this.sentenceLengthSort = 'asc'
            this.filterWaniKaniLevel = true
            this.filterAnimeShows = {}
            this.filterAnimeMovies = {}
            // Some Ghibli films are enabled by default
            this.filterGhibli = {4: true, 6: true, 7: true}
        }
    }

    class State implements AS.State {
        settings: Settings
        item?: KSOF.Core.ItemInfo
        immersionKitData?:AS.ImmersionKitData
        sentencesEl?:HTMLDivElement
        topEl?:HTMLDivElement

        constructor() {
            this.settings = new Settings()
        }

        onExamplesHidden() {
            if (this.topEl) {
                this.topEl.remove()
                delete this.topEl
                delete this.sentencesEl
                // delete this.item
                delete this.immersionKitData
            }
        }

        async addAnimeSentences() {
            if (!this.item) {
                return
            }

            const parentEl = document.createElement('div');
            parentEl.setAttribute('id', 'anime-sentences-parent')
    
            const header = this.item.on !== 'itemPage' ? document.createElement('h2') : document.createElement('h3');
            header.innerText = 'Anime Sentences'
    
            const settingsBtn = document.createElement('i');
            settingsBtn.textContent = '⚙'
            settingsBtn.setAttribute('class', 'fa fa-gear');
            settingsBtn.setAttribute('style', 'cursor: pointer; vertical-align: middle; margin-left: 10px;');
            settingsBtn.onclick = this.openSettings
            const sentencesEl = document.createElement('div');
            sentencesEl.innerText = 'Loading...'
    
            header.append(settingsBtn)
            parentEl.append(header)
            parentEl.append(sentencesEl)
            this.sentencesEl = sentencesEl
            this.topEl = parentEl
    
            // if (this.item.injector) {
            //     if (this.item.on === 'lesson') {
            //         this.item.injector.appendAtTop(null, parentEl)
            //     } else { // itemPage, review
            //         this.item.injector.append(null, parentEl)
            //     }
            // }
    
            if (this.item.on === 'itemPage') {
                document.querySelector('#app.kamesame #item')?.appendChild(parentEl)
            } else { // itemPage, review
                document.querySelector('.outcome')?.appendChild(parentEl)
            }
    
            const queryString = this.item.characters?.replace('〜', '');  // for "counter" kanji
            const url = `https://api.immersionkit.com/look_up_dictionary?keyword=${queryString}&tags=&jlpt=&sort=shortness&category=anime`
            
            try {
                const response = await fetch(url)
                const data = await response.json()
                this.immersionKitData = data.data[0].examples
                this.renderSentences()
            } catch (error) {
                console.error(error)
                this.onExamplesHidden()
                parentEl.remove()
            }
        }

        getDesiredShows() {
            // Convert settings dictionaries to array of titles
            const titles:string[] = []

            for (const [key, value] of Object.entries(this.settings.filterAnimeShows)) {
                if (value === true) {
                    titles.push(ANIME_SHOWS[Number(key)])
                }
            }
            for (const [key, value] of Object.entries(this.settings.filterAnimeMovies)) {
                if (value === true) {
                    titles.push(ANIME_MOVIES[Number(key)])
                }
            }
            for (const [key, value] of Object.entries(this.settings.filterGhibli)) {
                if (value === true) {
                    titles.push(GHIBLI_TITLES[Number(key)])
                }
            }

            return titles
        }
    
        renderSentences() {
            // Called from immersionkit response, and on settings save
            let examples = this.immersionKitData;
            if (!examples) {
                return
            }
            const exampleLenBeforeFilter = examples.length
    
            // Exclude non-selected titles
            const desiredTitles = this.getDesiredShows()
            examples = examples.filter(ex => desiredTitles.includes(ex.deck_name))
            if (this.settings.sentenceLengthSort === 'asc') {
                examples.sort((a, b) => a.sentence.length - b.sentence.length)
            } else {
                examples.sort((a, b) => b.sentence.length - a.sentence.length)
            }
    
            const showJapanese = this.settings.showJapanese;
            const showEnglish = this.settings.showEnglish;
            const showFurigana = this.settings.showFurigana;
            const playbackRate = this.settings.playbackRate
    
            let html = '';
            if (exampleLenBeforeFilter === 0) {
                html = 'No sentences found.'
            } else if (examples.length === 0 && exampleLenBeforeFilter > 0) {
                // TODO show which titles have how many examples
                html = 'No sentences found for your selected movies & shows.'
            } else {
                const lim = Math.min(examples.length, 50)
    
                for (let i = 0; i < lim; i++) {
                    const example = examples[i]
    
                    const japaneseText = this.settings.showFurigana === 'never' ?
                        example.sentence :
                        new Furigana(example.sentence_with_furigana).ReadingHtml
    
                    html += `
        <div class="anime-example">
            <img src="${example.image_url}" alt="">
            <div class="anime-example-text">
                <div class="title" title="${example.id}">${example.deck_name}</div>
                <div class="ja">
                    <span class="${showJapanese === 'onhover' ? 'show-on-hover' : ''} ${showFurigana === 'onhover' ? 'show-ruby-on-hover' : ''}  ${showJapanese === 'onclick' ? 'show-on-click' : ''}">${japaneseText}</span>
                    <span><button class="audio-btn audio-idle">🔈</button></span>
                    <audio src="${example.sound_url}"></audio>
                </div>
                <div class="en">
                    <span class="${showEnglish === 'onhover' ? 'show-on-hover' : ''} ${showEnglish === 'onclick' ? 'show-on-click' : ''}">${example.translation}</span>
                </div>
            </div>
        </div>`
                }
            }
    
            const sentencesEl = this.sentencesEl
            if(sentencesEl) sentencesEl.innerHTML = html
    
            const audios = document.querySelectorAll('.anime-example audio')
            audios.forEach((a:any) => {
                a.playbackRate = playbackRate
                const button = a.parentNode.querySelector('button')
                a.onplay = () => {
                    button.setAttribute('class', 'audio-btn audio-play')
                };
                a.onended = () => {
                    button.setAttribute('class', 'audio-btn audio-idle')
                };
            })
    
            // Click anywhere plays the audio
            const exampleEls = document.querySelectorAll('.anime-example')
            exampleEls.forEach((a:any) => {
                a.onclick = function () {
                    const audio = this.querySelector('audio')
                    audio?.play()
                }
            });
    
            // Assigning onclick function to .show-on-click elements
            document.querySelectorAll('.show-on-click').forEach((a:any) => {
                a.onclick = function () {
                    this.classList.toggle('show-on-click');
                }
            });
        }

        //--------------------------------------------------------------------------------------------------------------//
        //----------------------------------------------SETTINGS--------------------------------------------------------//
        //--------------------------------------------------------------------------------------------------------------//

        loadSettings() {
            return ksof.Settings.load(scriptId, this.settings);
        }

        processLoadedSettings() {
            this.settings = ksof.settings[scriptId] as AS.Settings
        }

        openSettings() {
            const config: KSOF.Settings.Config = {
                script_id: scriptId,
                title: scriptName,
                on_save: this.updateSettings,
                content: {
                    general: {
                        type: 'section',
                        label: 'General'
                    },
                    sentenceLengthSort: {
                        type: 'dropdown',
                        label: 'Sentence Order',
                        hover_tip: '',
                        content: {
                            asc: 'Shortest first',
                            desc: 'Longest first'
                        },
                        default: this.settings.sentenceLengthSort
                    },
                    playbackRate: {
                        type: 'number',
                        label: 'Playback Speed',
                        min: 0.5,
                        max: 2,
                        hover_tip: 'Speed to play back audio.',
                        default: this.settings.playbackRate
                    },
                    showJapanese: {
                        type: 'dropdown',
                        label: 'Show Japanese',
                        hover_tip: 'When to show Japanese text. Hover enables transcribing a sentences first (play audio by clicking the image to avoid seeing the answer).',
                        content: {
                            always: 'Always',
                            onhover: 'On Hover',
                            onclick: 'On Click',
                        },
                        default: this.settings.showJapanese
                    },
                    showFurigana: {
                        type: 'dropdown',
                        label: 'Show Furigana',
                        hover_tip: 'These have been autogenerated so there may be mistakes.',
                        content: {
                            always: 'Always',
                            onhover: 'On Hover',
                            never: 'Never',
                        },
                        default: this.settings.showFurigana
                    },
                    showEnglish: {
                        type: 'dropdown',
                        label: 'Show English',
                        hover_tip: 'Hover or click allows testing your understanding before seeing the answer.',
                        content: {
                            always: 'Always',
                            onhover: 'On Hover',
                            onclick: 'On Click',
                        },
                        default: this.settings.showEnglish
                    },
                    tooltip: {
                        type: 'section',
                        label: 'Filters'
                    },
                    filterGhibli: {
                        type: 'list',
                        label: 'Ghibli Movies',
                        multi: true,
                        size: 6,
                        hover_tip: 'Select which Studio Ghibli movies you\'d like to see examples from.',
                        default: this.settings.filterGhibli,
                        content: GHIBLI_TITLES
                    },
                    filterAnimeMovies: {
                        type: 'list',
                        label: 'Anime Movies',
                        multi: true,
                        size: 6,
                        hover_tip: 'Select which anime movies you\'d like to see examples from.',
                        default: this.settings.filterAnimeMovies,
                        content: ANIME_MOVIES
                    },
                    filterAnimeShows: {
                        type: 'list',
                        label: 'Anime Shows',
                        multi: true,
                        size: 6,
                        hover_tip: 'Select which anime shows you\'d like to see examples from.',
                        default: this.settings.filterAnimeShows,
                        content: ANIME_SHOWS
                    },
                    filterWaniKaniLevel: {
                        type: 'checkbox',
                        label: 'WaniKani Level',
                        hover_tip: 'Only show sentences with maximum 1 word outside of your current WaniKani level.',
                        default: this.settings.filterWaniKaniLevel,
                    },
                    credits: {
                        type: 'section',
                        label: 'Powered by immersionkit.com'
                    },
                }
            };
            const dialog = ksof.Settings(config);
            dialog.open();
        }

        // Called when the user clicks the Save button on the Settings dialog.
        updateSettings() {
            this.settings = ksof.settings[scriptId] as AS.Settings
            this.renderSentences();
        }

        onExamplesVisible(item: KSOF.Core.ItemInfo) {
            if (ksof.itemInfo.on == 'review') {
                if (ksof.reviewInfo.answer_correct != 'exactly_correct') {
                    return
                }
            }
            this.item = item
            this.addAnimeSentences()
        }
    }

    // Titles taken from https://www.immersionkit.com/information
    const ANIME_SHOWS: {[key:number]: string} = {
        0: 'Angel Beats!',
        1: 'Anohana: The Flower We Saw That Day',
        2: 'Assassination Classroom Season 1',
        3: 'Bakemonogatari',
        4: 'Boku no Hero Academia Season 1',
        5: 'Cardcaptor Sakura',
        6: 'Chobits',
        7: 'Clannad',
        8: 'Clannad After Story',
        9: 'Code Geass Season 1',
        10: 'Daily Lives of High School Boys',
        11: 'Death Note',
        12: 'Durarara!!',
        13: 'Erased',
        14: 'Fairy Tail',
        15: 'Fate Stay Night UBW Season 1',
        16: 'Fate Stay Night UBW Season 2',
        17: 'Fate Zero',
        18: 'From the New World',
        19: 'Fruits Basket Season 1',
        20: 'Fullmetal Alchemist Brotherhood',
        21: 'God\'s Blessing on this Wonderful World!',
        22: 'Haruhi Suzumiya',
        23: 'Hunter × Hunter',
        24: 'Is The Order a Rabbit',
        25: 'K-On!',
        26: 'Kanon (2006)',
        27: 'Kill la Kill',
        28: 'Kino\'s Journey',
        29: 'Kokoro Connect',
        30: 'Little Witch Academia',
        31: 'Mahou Shoujo Madoka Magica',
        32: 'My Little Sister Can\'t Be This Cute',
        33: 'New Game!',
        34: 'No Game No Life',
        35: 'Noragami',
        36: 'One Week Friends',
        37: 'Psycho Pass',
        38: 'Re:Zero − Starting Life in Another World',
        39: 'Shirokuma Cafe',
        40: 'Steins Gate',
        41: 'Sword Art Online',
        42: 'Toradora!',
        43: 'Wandering Witch The Journey of Elaina',
        44: 'Your Lie in April',
    }

    const ANIME_MOVIES: {[key:number]: string} = {
        0: 'Only Yesterday',
        1: 'The Garden of Words',
        2: 'The Girl Who Leapt Through Time',
        3: 'The World God Only Knows',
        4: 'Weathering with You',
        5: 'Wolf Children',
        6: 'Your Name',
    }

    const GHIBLI_TITLES: {[key:number]: string} = {
        0: 'Castle in the sky',
        1: 'From Up on Poppy Hill',
        2: 'Grave of the Fireflies',
        3: 'Howl\'s Moving Castle',
        4: 'Kiki\'s Delivery Service',
        5: 'My Neighbor Totoro',
        6: 'Princess Mononoke',
        7: 'Spirited Away',
        8: 'The Cat Returns',
        9: 'The Secret World of Arrietty',
        10: 'The Wind Rises',
        11: 'When Marnie Was There',
        12: 'Whisper of the Heart',
    }

    main();

    function main() {
        setTimeout(init, 0)
    }

    async function init() {
        createStyle();

        if (ksof) {
            ksof.include('Settings');

            await ksof.ready('Settings')
            const state = new State()
            await state.loadSettings()
            state.processLoadedSettings()

            if (ksof.itemInfo.on == 'itemPage') {
                const FACTS_QUERY = '#app.kamesame #item .facts .fact'
                const FACTS_WATCH_STATE = 'ksof.dom_observer.'+FACTS_QUERY
     
                ksof.add_dom_observer(FACTS_QUERY)
                ksof.wait_state(FACTS_WATCH_STATE, 'exists', () => { state.onExamplesVisible(ksof.itemInfo) }, true)
            }
            else if (ksof.itemInfo.on == 'review') {
                const OUTPUT_ITEM_QUERY = '.outcome p a.item'
                const OUTPUT_ITEM_WATCH_STATE = 'ksof.dom_observer.'+OUTPUT_ITEM_QUERY
     
                ksof.add_dom_observer(OUTPUT_ITEM_QUERY)
                ksof.wait_state(OUTPUT_ITEM_WATCH_STATE, 'exists', () => { state.onExamplesVisible(ksof.itemInfo) }, true)
                ksof.wait_state(OUTPUT_ITEM_WATCH_STATE, 'gone', state.onExamplesHidden, true)
            }

        } else {
            console.error(
                `${scriptName}: You are not using KameSame Open Framework which this script utlizes`
            );
        }
    }

    //--------------------------------------------------------------------------------------------------------------//
    //-----------------------------------------------STYLES---------------------------------------------------------//
    //--------------------------------------------------------------------------------------------------------------//

    function createStyle() {
        const style = document.createElement('style');
        style.setAttribute('id', 'anime-sentences-style');
        // language=CSS
        style.innerHTML = `
            #anime-sentences-parent > div {
                overflow-y: auto;
                max-height: 280px;
            }

            .anime-example {
                display: flex;
                align-items: center;
                margin-bottom: 1em;
                cursor: pointer;
            }

            /* Make text and background color the same to hide text */
            .anime-example-text .show-on-hover, .anime-example-text .show-on-click {
                background: #ccc;
                color: #ccc;
            }

            .anime-example-text .show-on-hover:hover {
                background: inherit;
                color: inherit
            }

            /* Furigana hover*/
            .anime-example-text .show-ruby-on-hover ruby rt {
                visibility: hidden;
            }

            .anime-example-text:hover .show-ruby-on-hover ruby rt {
                visibility: visible;
            }

            .anime-example .title {
                font-weight: 700;
            }

            .fa-gear {
                font-size: 1rem;
            }

            .anime-example .ja {
                font-size: 2em;
            }

            .anime-example img {
                margin-right: 1em;
                max-width: 200px;
            }

            #anime-sentences-parent .anime-example-text .audio-btn {
                border: none;
                box-shadow: none;
                padding: 0;
                font-size: 2rem;
                margin: 0px 0px 5px 0px;
                background:transparent;
            }
            `;

        document.querySelector('head')?.append(style);
    }


    //--------------------------------------------------------------------------------------------------------------//
    //----------------------------------------------FURIGANA--------------------------------------------------------//
    //--------------------------------------------------------------------------------------------------------------//
    // https://raw.githubusercontent.com/helephant/Gem/master/src/Gem.Javascript/gem.furigana.js
    class Furigana {
        segments:(FuriganaSegment | UndecoratedSegment)[]

        constructor(reading:string) {
            this.segments = ParseFurigana(reading || '');
        }


        get Reading() {
            let reading = '';
            for (const segment of this.segments) {
                reading += segment.Reading;
            }
            return reading.trim();
        }

        get Expression() {
            let expression = '';
            for (const segment of this.segments) {
                expression += segment.Expression;
            }
            return expression;
        }

        get Hiragana() {
            let hiragana = '';
            for (const segment of this.segments) {
                hiragana += segment.Hiragana;
            }
            return hiragana;
        }

        get ReadingHtml() {
            let html = '';
            for (const segment of this.segments) {
                html += segment.ReadingHtml;
            }
            return html;
        }
    }

    class FuriganaSegment {
        Expression:string
        Hiragana:string
        Reading:string
        ReadingHtml:string

        constructor(baseText:string, furigana:string) {
            this.Expression = baseText;
            this.Hiragana = furigana.trim();
            this.Reading = baseText + '[' + furigana + ']';
            this.ReadingHtml = '<ruby><rb>' + baseText + '</rb><rt>' + furigana + '</rt></ruby>';
        }
    }

    class UndecoratedSegment {
        Expression:string
        Hiragana:string
        Reading:string
        ReadingHtml:string

        constructor(baseText:string) {
            this.Expression = baseText;
            this.Hiragana = baseText;
            this.Reading = baseText;
            this.ReadingHtml = baseText;
        }
    }

    function ParseFurigana(reading:string) {
        const segments: (FuriganaSegment|UndecoratedSegment)[] = [];

        let currentBase = '';
        let currentFurigana = '';
        let parsingBaseSection = true;
        let parsingHtml = false;

        const characters = reading.split('');

        while (characters.length > 0) {
            const current = characters.shift();

            if (current === '[') {
                parsingBaseSection = false;
            } else if (current === ']') {
                nextSegment();
            } else if (isLastCharacterInBlock(current||'', characters) && parsingBaseSection) {
                currentBase += current;
                nextSegment();
            } else if (!parsingBaseSection)
                currentFurigana += current;
            else
                currentBase += current;
        }

        nextSegment();

        function nextSegment() {
            if (currentBase)
                segments.push(getSegment(currentBase, currentFurigana));
            currentBase = '';
            currentFurigana = '';
            parsingBaseSection = true;
            parsingHtml = false;
        }

        function getSegment(baseText:string, furigana:string) {
            if (!furigana || furigana.trim().length === 0)
                return new UndecoratedSegment(baseText);
            return new FuriganaSegment(baseText, furigana);
        }

        function isLastCharacterInBlock(current:string, characters:string[]) {
            return !characters.length ||
                (isKanji(current) !== isKanji(characters[0]) && characters[0] !== '[');
        }

        function isKanji(character:string) {
            return character && character.charCodeAt(0) >= 0x4e00 && character.charCodeAt(0) <= 0x9faf;
        }

        return segments;
    }

})();

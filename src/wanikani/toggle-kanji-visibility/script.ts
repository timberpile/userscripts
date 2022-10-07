/* jshint esversion: 6 */

// ==UserScript==
// @name        Wanikani Toggle Kanji Visibility
// @description Adds buttons that toggle the visibility of Kanji and their readings on the Wanikani Kanji pages
// @version     1.1
// @match       https://www.wanikani.com/kanji*
// @author      Timberpile
// @license     MIT; http://opensource.org/licenses/MIT
// @run-at      document-end
// @grant       none
// ==/UserScript==

// These lines are necessary to make sure that TSC does not put any exports in the
// compiled js, which causes the script to crash
// eslint-disable-next-line no-var, @typescript-eslint/no-unused-vars
var module = {}
export = null

// SETTINGS
const hideAtBeginning = true;

// CODE
(() => {
    'use strict';

    type LevelsRange = {first:number, last:number}

    const buttons = [];

    function getLevels(): LevelsRange {
        for (const e of document.getElementsByClassName('page-header__title-subtext')) {
            if (e.textContent?.startsWith('LEVELS')) {
                const text = e.textContent.replace('LEVELS ', '');
                const vals = text.split('-');
                if (vals.length == 2) {
                    return {first: Number(vals[0]), last: Number(vals[1])}
                }
            }
        }

        return {first:0, last:0};
    }

    function onToggleKanjiClick(event: MouseEvent) {
        const button = event.target as HTMLButtonElement
        if (!button.parentElement) return
        const characters = button.parentElement.getElementsByClassName('character-item__characters');
        const visible = !characters[0].hasAttribute('hidden');

        if (visible) {
            for (const char of characters) {
                char.setAttribute('hidden', 'true');
            }
        } else {
            for (const char of characters) {
                char.removeAttribute('hidden');
            }
        }
    }

    function onToggleReadingsClick(event: MouseEvent) {
        const button = event.target as HTMLButtonElement
        if (!button.parentElement) return
        const readings = button.parentElement.getElementsByClassName('character-item__info-reading');
        const visible = !readings[0].hasAttribute('hidden');

        if (visible) {
            for (const reading of readings) {
                reading.setAttribute('hidden', 'true');
            }
        } else {
            for (const reading of readings) {
                reading.removeAttribute('hidden');
            }
        }
    }

    const levels = getLevels();

    if (levels.first <= 0) {
        console.error('Couldn\'t find out levels');
        return;
    }

    for (let i = levels.first; i <= levels.last; i++) {
        const level_anchor = document.getElementById('level-' + i);
        if (!level_anchor) {
            continue;
        }
        const level_section = level_anchor.parentElement;
        if (!level_section) {
            continue;
        }

        const kanjiButton = document.createElement('button');
        kanjiButton.textContent = 'Toggle Kanji';
        kanjiButton.onclick = onToggleKanjiClick;
        buttons.push(kanjiButton);
        level_section.prepend(kanjiButton);

        const readingsButton = document.createElement('button');
        readingsButton.textContent = 'Toggle Readings';
        readingsButton.onclick = onToggleReadingsClick;
        buttons.push(readingsButton);
        level_section.prepend(readingsButton);
    }

    if (hideAtBeginning) {
        for (const b of buttons) {
            b.click();
        }
    }

})();
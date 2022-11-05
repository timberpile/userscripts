
import { KSOF } from '../types/ksof'

export declare namespace AS {
    export type ShowFilter = {[key:number]: boolean}
    
    export interface Settings {
        playbackRate: number
        showEnglish: 'always' | 'onhover' | 'onclick'
        showJapanese: 'always' | 'onhover' | 'onclick'
        showFurigana: 'always' | 'onhover' | 'never'
        sentenceLengthSort: 'asc' | 'desc'
        filterWaniKaniLevel: boolean
        filterAnimeShows: ShowFilter
        filterAnimeMovies: ShowFilter
        filterGhibli: ShowFilter
    }

    export type ImmersionKitData = {
        author_japanese: string
        category: string // 'anime' | ?
        channel: string
        deck_name: string
        deck_name_japanese: string
        episode: string
        id: number
        image_url: string
        position: number
        sentence: string
        sentence_id: string
        sentence_with_furigana: string
        sound_begin: string
        sound_end: string
        sound_url: string
        tags: string[]
        timestamp: string
        translation: string
        translation_word_index: number[]
        translation_word_list: string[]
        word_index: number[]
        word_list: string[]
    }[]

    export interface State {
        settings: Settings
        item?: KSOF.Core.ItemInfo // current vocab
        immersionKitData?:ImmersionKitData // cached so sentences can be re-rendered after settings change
        sentencesEl?:HTMLDivElement // referenced so sentences can be re-rendered after settings change
        topEl?:HTMLDivElement // referenced so can be deleted afterwards
    }
}

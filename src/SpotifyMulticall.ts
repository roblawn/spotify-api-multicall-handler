
//import { CommandFailedEvent } from "mongodb";
//import { AccessToken } from "@/modules/ServerComs";
//import { Track } from "../../models/SpotifyInterfaces";


import SpotifyWebApi from "spotify-web-api-node";
import {SpotifyCallManager} from './SpotifyCallManager'
import { SpotifyPlaylistCreator } from "./SpotifyPlaylistCreator";
import { SpotifySnapshot } from "./SpotifySnapshot";


type SpotifyOptions = {
    limit?:number | undefined
    offset?:number | undefined
    market?:string | undefined
}

//const UserPlaylists = require('./UserPlaylists.js');
//const SpotifyPlaylistCreator = require('./SpotifyPlaylistCreator.js');
  

//responsible for handling Spotify Data Structure and filling native Objects with their correct Data
export class SpotifyMulticallHandler{

    //must be in multiples of 100 (currently)
    public static MAX_TRACKS = 299 

    private spotifyApi:SpotifyWebApi
   
    
    //must be passed an initialised SpotifyWebAPI
    constructor(spotifyAPI:SpotifyWebApi){
       this.spotifyApi = spotifyAPI    
       
    }

    public async createAuthorizeURL(scopes: ReadonlyArray<string>, state: string, showDialog?: boolean){
       const response = await this.spotifyApi.createAuthorizeURL(scopes, state, showDialog)
       return response
    }

   

    async getUser(){
        
        const callManager = new SpotifyCallManager(this.spotifyApi)               
        const response = await  callManager.makeSingleCall(this.spotifyApi.getMe)        
        return response.body
    }

   
    async loadPlaylist(playlistID:string){
        
        const callManager = new SpotifyCallManager(this.spotifyApi)        
        const response = await  callManager.makeSingleCall(this.spotifyApi.getPlaylist, playlistID)        
     
        return response.body

    }
    

    //rewrite to work for multiple Users, with default to current user.
    //add pagination
    async loadPlaylists(userID:string | undefined = undefined  , quantity:number, offset = 0){ 

      
        let pCount = offset
        const callManager = new SpotifyCallManager(this.spotifyApi)
        let response = []
       
        while (pCount < quantity + offset){
            const tn = Math.min(quantity, 50)
            const options:SpotifyOptions = {
                limit:tn,
                offset:pCount
            }
            const pList = await callManager.makeSingleCall(this.spotifyApi.getUserPlaylists, userID, options)
           
            if (Array.isArray(pList.body.items) && Array.isArray(response)){
                
                response = response.concat(pList.body.items)
            
            } else {
                throw new Error('response array concatination Error.')
            }
            pCount += tn 
                    
        }
        return response
    }
    

    async loadPlaylistTracks(playlistId:string, userDisplayName = '', country_code = ''){
     
              
        const callManager = new SpotifyCallManager(this.spotifyApi)
        let response = []

        let tCount = 0
        let trackLength = 1

        while (tCount < trackLength){
            const tn = 100
            const options:SpotifyOptions = {
                limit:tn,
                offset:tCount,
                market:country_code
            }
        
            const tList = await callManager.makeSingleCall(this.spotifyApi.getPlaylistTracks, playlistId, options)
            
            trackLength = Math.min(SpotifyMulticallHandler.MAX_TRACKS, tList.body.total)

            if (Array.isArray(tList.body.items) && Array.isArray(response)){
                                
                response = response.concat(tList.body.items)
            
            } else {
                throw new Error('response array concatination Error.')
            }
            
            tCount += tn   
        }      
      
       
        return response
       
    }

    

    //accepts a list of track objects
    async loadAudioFeatures(tracks:Array<string>){
       

        //pull out ids, to send a call for all tracks
        
        let audiofeatures = []
        let fCount = 0
        const callManager = new SpotifyCallManager(this.spotifyApi)
        const playlistLength = tracks.length

        while (fCount < playlistLength){
            const callCount = Math.min(100, playlistLength - fCount)
            const idList = []

            for (let j=fCount; j<callCount + fCount ; j++){                
                idList.push(tracks[j])                            
            }
            fCount += idList.length
            
            const a = await callManager.makeSingleCall(this.spotifyApi.getAudioFeaturesForTracks, idList)
            
            if (Array.isArray(a.body.audio_features) && Array.isArray(audiofeatures)){
                                
                audiofeatures = audiofeatures.concat(a.body.audio_features)
            
            } else {
                throw new Error('response audiofeatures concatination Error.')
            }
             
        }

        
      
        return audiofeatures
    }

    

    async loadArtistsTopTracks(artistIDList:Array<string>, country_code = ''){


        const callManager = new SpotifyCallManager(this.spotifyApi) 
        const paramList = artistIDList.map((element) =>{
            return [element, country_code]
        })
        const response = await  callManager.makeMultipleCalls(this.spotifyApi.getArtistTopTracks, paramList)        
        
     
        return response
    }

    async loadAlbumsTracks(idList: Array<string>, country_code:string){

        const options:SpotifyOptions = {market:country_code}
        const result = await this.loadLongList(idList, options, this.spotifyApi.getAlbums, "albums", 20)

        
        return result


    }

    async loadArtists(artistIDList:Array<string>){
        const result = await this.loadLongList(artistIDList, undefined, this.spotifyApi.getArtists, "artists", 50)
        return result
       

    }

    async loadLongList(idList:Array<string>, options:SpotifyOptions | undefined , callFunction:Function, responseBodyName:string, maxCalls:number){
       

        //pull out ids, to send a call for all tracks
        
        let arr = []
        let fCount = 0
        const callManager = new SpotifyCallManager(this.spotifyApi)

        const loadListLength = idList.length

        while (fCount < loadListLength){
            const callCount = Math.min(maxCalls, loadListLength - fCount)
            let paramList = []


            paramList = idList.slice(fCount, callCount + fCount) 
            const l =  paramList.length          
            fCount += paramList.length
            const newParams = paramList.filter(param => param !== null && param !== undefined)
          
            let a
            try {
                a = await callManager.makeSingleCall(callFunction, paramList, options)
            } catch (error:any){
                // console.log("---error loading data : " + callFunction.name) 
                // console.dir(paramList)
                // console.dir(error)
                // console.log("---error compconste")
            }            
             
            
            if (Array.isArray(a?.body[responseBodyName]) && Array.isArray(arr)){                                
                arr = arr.concat(a.body[responseBodyName])            
            } else {
                throw new Error(`response ${responseBodyName} concatination Error.`)
            }
             
        }
        return arr
    }


    //accepts a list of track objects
    async loadPlaylistAudioAnalysis(tracks:Array<string>){
   
        const callManager = new SpotifyCallManager(this.spotifyApi)
        //load analysis for all tracks  
        
        const tracksToLoad = tracks.map(element => element)

        const response = await callManager.makeMultipleCalls(this.spotifyApi.getAudioAnalysisForTrack, tracksToLoad)       
     
       return response
    }

    async overwritePlaylist(id:string, trackURIs:Array<string> ):Promise<boolean>{
        
        let success = false
        let snapshot = await new SpotifySnapshot(this.spotifyApi)
        snapshot.cachePlaylist(id)      

        try {
            let playListCreator = new SpotifyPlaylistCreator(this.spotifyApi)       
            success = await playListCreator.overwritePlaylist(id, trackURIs)
        } catch (error){
            let revert:boolean = await snapshot.revertPlaylist()
            if (!revert){
                throw new Error("Playlist revert did not work, playlist may be compromised")
            } 
            return success
        }
        return success
    }

    async saveNewPlaylist(name:string, description:string, trackURIs:Array<string>):Promise<any>{
        //Save as a Spotify Playlist.

        if (name === undefined || name === ""){
            throw new Error("savePlaylist: no name selected")
        }
        let playListCreator = new SpotifyPlaylistCreator(this.spotifyApi)        
        let savedPlaylist = await playListCreator.createPlaylist(name, description, trackURIs)
        
        //add error code in here
        return savedPlaylist
    }

    
}


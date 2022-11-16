

import {SpotifyCallManager} from './SpotifyCallManager.js';
import SpotifyWebApi from "spotify-web-api-node"


export class SpotifyPlaylistCreator{

    private spotifyApi:SpotifyWebApi
    private callManager:SpotifyCallManager
  

    constructor(spotifyApi:SpotifyWebApi){
        this.spotifyApi = spotifyApi 
        this.callManager = new SpotifyCallManager(this.spotifyApi)      
    }

    
    async overwritePlaylist (id:string, trackURIs:Array<string>):Promise<boolean>{

        //if there are less than 100 tracks then it is easy:
        let tracksToLoad:Array<any> = trackURIs.splice(0, 100)
        
        let result = await this.callManager.makeSingleCall(this.spotifyApi.replaceTracksInPlaylist, id, tracksToLoad).catch(error => {
            console.log(error)
            throw new Error("playlist overwrite failed")
        })  
        
        while (trackURIs.length > 0){
            tracksToLoad = trackURIs.splice(0, Math.min(100, trackURIs.length))
            result = await this.callManager.makeSingleCall(this.spotifyApi.addTracksToPlaylist, id, tracksToLoad).catch(error => {
                console.log(error)
                throw new Error("playlist overwrite failed")
            })             
        }

        return true
        
    }

    async createPlaylist(name:string, description:string, trackURIs:Array<string>){

         const options = {'description': description, 'collaborative' : false, 'public': true}
                     
        const createdPlaylist = await this.callManager.makeSingleCall(this.spotifyApi.createPlaylist, name, options).catch(error => {
            console.log(error)
        })
        
        let tracksAdded = []
        let tCount = 0       
        let playlistLength = trackURIs.length
        let response = []

        while (tCount < playlistLength){
            let callCount = Math.min(100, playlistLength - tCount)
            let uriList = []

            for (let j=tCount; j<callCount + tCount ; j++){                
                uriList.push(trackURIs[j])                            
            }
            tCount += uriList.length
            
            let a = await this.callManager.makeSingleCall(this.spotifyApi.addTracksToPlaylist, createdPlaylist.body.id, uriList)            
            if (Array.isArray(response)){
                response = response.concat(a.body.response) 
            }              
        } 

        return createdPlaylist.body

    }

}

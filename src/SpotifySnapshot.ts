import SpotifyWebApi from "spotify-web-api-node"
import { SpotifyCallManager } from "./SpotifyCallManager"

export class SpotifySnapshot{


    private snapshotId:string | undefined
    private id:string | undefined
    
    private spotifyApi:SpotifyWebApi
    private callManager:SpotifyCallManager

    constructor(spotifyApi:SpotifyWebApi){
        this.spotifyApi = spotifyApi 
        this.callManager = new SpotifyCallManager(this.spotifyApi)      
    }

    async cachePlaylist(id:string):Promise<boolean>{
        if (this.snapshotId !== undefined || (this.id !== undefined && this.id !== id)){
            throw new Error("SpotifySnapshot is only meant for use on a single playlist. Create a new instance if you want to save a different playlist")
        }
        this.id = id       
        
        const playlist = await this.callManager.makeSingleCall(this.spotifyApi.getPlaylist, id).catch(error => {
            console.log(error)
            throw new Error("do not overwrite playlist")
        })
        this.snapshotId = playlist.body.snapshot_id

        return true
    }

    async revertPlaylist():Promise<boolean>{
        if (this.snapshotId === undefined) return false
        const playlist = await this.callManager.makeSingleCall(this.spotifyApi.removeTracksFromPlaylist, 
                                                            this.id, [], {snapshot_id:this.snapshotId}).catch(error => {
            console.log(error)
            return false
        })

        return true

    }

}
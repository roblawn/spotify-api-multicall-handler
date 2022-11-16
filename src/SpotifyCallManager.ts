import SpotifyWebApi from "spotify-web-api-node";


const MAX_CALLS = 50

export class SpotifyCallManager{

    private spotifyApi:SpotifyWebApi   
    
    constructor(spotifyApi:SpotifyWebApi){
        this.spotifyApi = spotifyApi             
    }

    //pass the function to call, and then as many arguments as should be called
    public async makeSingleCall(call : Function, ...params : any) : Promise <any> {
        //let args = [].slice.call(arguments)
        //args = args.filter(element => element !== undefined)
        const f : Function = call
        //args.shift()
        
        let hasError = false
        let retryTime = 1000


        let response = await f.apply(this.spotifyApi, params).catch((error : any)  => {
            if (error.statusCode === 429){ 
                //console.log('attempting to set retryTime = ' + retryTime)              
                try {
                    retryTime = parseInt(error.headers["retry-after"])* 1000
                    //console.log('retryTime = ' + retryTime)
                   
                } catch (error){
                    retryTime = 1000
                }
                hasError = true
            } else {
                throw new Error(error)
            }   
        })     

        if (hasError){
            await this.delay(retryTime)          
            response = this.makeSingleCall(call, params)
        } 

        return response
    }

    public async makeMultipleCalls(call : Function, paramList : Array <any>){
        
        
        let response = []
       
        while (paramList.length > 0){
             
            const pList = paramList.splice(0, MAX_CALLS)
         
            const r : Array <any> = await this._internalMakeMultipleCalls(call, pList)
           
            if (Array.isArray(response) && Array.isArray(r)) response = response.concat(r) 

        }     
        return response
       


    }

    //pass the function to call, and then a list of arguments for each call as an array
    private async _internalMakeMultipleCalls(call : Function, paramList : Array <any>){

        let responses:Array < any > = []
        const promises:Array < any > = [] 
        const failedList:Array < any > = []
        let retryTime = 1000

        for (let i=0; i<paramList.length; i++){

            let trackId:Array<any> = paramList[i]

            if (!Array.isArray(trackId)) trackId = [trackId]

            const promise = call.apply(this.spotifyApi, trackId).then((response : any) => {                
                if (this.checkResponse(response)){
                    responses.push({trackId:trackId,
                                    response:response.body}) 
                } else {
                    failedList.push(trackId) 
                }    
            }).catch((error : any) =>{
                if (error.statusCode >= 200 && error.statusCode <= 300){
                    //ignore?!
                } else if (error.statusCode >= 400){
                    failedList.push(trackId)
                    try {
                        retryTime = parseInt(error.headers["retry-after"])* 1000 ?? 4000
                        //console.log('retryTime = ' + retryTime)
                    } catch (error){
                        retryTime = 4000
                    }
                }  else {
                    //console.log ("unhandled spotify error: " + error.statusCode)
                }           
            })
            promises.push(promise)
        }

        await Promise.all(promises)


        if (failedList.length > 0){
           
            await this.delay(retryTime) 
            const r = await this.makeMultipleCalls(call, failedList)
            if (Array.isArray(responses) && Array.isArray(r)) responses = responses.concat(r)
        
        }

        return responses    

    }

    //to write
    checkError(error : any){
        //console.log("checkError - to implement")
    }

    checkResponse(response : any){
        switch(response.statusCode){
            case 200:
                break;
            case 429:
                //The app has exceeded its rate limits.
                return false               
            case 401:
                //Bad or expired token. This can happen if the user revoked a token or the access token has expired. You should re-authenticate the user.
                break;
            case 403:
                //Bad OAuth request (wrong consumer key, bad nonce, expired timestamp...). Unfortunately, re-authenticating the user won't help here.
                break;            
            default:
                break
            }
            return true
    }

    
    async delay(retryTime = 1000) {
        if (retryTime === 0){            
            return
        }      
        await setTimeout(this.delay, 0); 
        return      
    }

}


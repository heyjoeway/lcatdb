import Platform from "./Platform";

export default {
    url: '<!--map_url-->',
    options: {
        attribution: '<!--map_attribution-->',
        maxZoom: 18,
        id: '<!--map_id-->',
        accessToken: '<!--map_token-->',
        useCache: Platform.inApp,
        crossOrigin: true
    }
}
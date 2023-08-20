from flask import escape
import functions_framework
import requests
import json
import time
from dotenv import load_dotenv
import os
load_dotenv()


def basic_info():
    config = dict()
    config["access_token"]         = os.getenv("ACCESS_TOKEN")
    config['instagram_account_id'] = os.getenv("USER_ID")
    config["version"]              = 'v17.0'
    config["graph_domain"]         = 'https://graph.facebook.com/'
    config["endpoint_base"]        = config["graph_domain"]+config["version"] + '/'
    return config

def InstaApiCall(url, params, request_type):
    if request_type == 'POST' :
        req = requests.post(url,params)
    else :
        req = requests.get(url,params)
    res = dict()
    res["url"] = url
    res["endpoint_params"]        = params
    res["endpoint_params_pretty"] = json.dumps(params, indent=4)
    res["json_data"]              = json.loads(req.content)
    res["json_data_pretty"]       = json.dumps(res["json_data"], indent=4)
    print(res)
    return res

def createMedia(params) :
    url = params['endpoint_base'] + params['instagram_account_id'] + '/media'

    Params = dict()
    Params['caption'] = params['caption']
    Params['access_token'] = params['access_token']
    Params['image_url'] = params['media_url']

    return InstaApiCall(url, Params, 'POST')

def getMediaStatus(mediaObjectId, params) :
    url = params['endpoint_base'] + '/' + mediaObjectId

    Params = dict()
    Params['fields']       = 'status_code'
    Params['access_token'] = params['access_token']

    return InstaApiCall(url, Params, 'GET')

def publishMedia(mediaObjectId, params):
    url = params['endpoint_base'] + params['instagram_account_id'] + '/media_publish'

    Params = dict()
    Params['creation_id'] = mediaObjectId
    Params['access_token'] = params['access_token']

    return InstaApiCall(url, Params, 'POST')

def instagram_upload_image(media_url, media_caption):

    params = basic_info()
    params['media_type'] = 'IMAGE'
    params['media_url']  =  media_url
    params['caption']    = media_caption

    imageMediaId = createMedia(params)['json_data']['id']

    StatusCode = 'IN_PROGRESS';
    while StatusCode != 'FINISHED' :
        StatusCode = getMediaStatus(imageMediaId,params)['json_data']['status_code']
        time.sleep(5)

    publishImageResponse = publishMedia(imageMediaId,params)
    print("Instagram投稿完了")
    return publishImageResponse['json_data_pretty']

@functions_framework.http
def hello_http(request):
    request_json = request.get_json(silent=True)
    image_url = request_json['image_url']
    caption = request_json['caption']
    print(image_url)
    print(caption)
    instagram_upload_image(image_url, caption)
    return {"message": "success"}
## Thank You Email
import json, time, os, boto3
from datetime import datetime
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr

print('Loading functions')

#AWS Resources
lambda_client = boto3.client('lambda')
dydb = boto3.resource('dynamodb')
client = boto3.client('pinpoint')
ssm = boto3.client('ssm')

# Local variables initialize
dtable = os.environ['dtable']
profTab = dydb.Table(dtable)

senderSSM = ssm.get_parameter(Name='LambdaPinPointSender', WithDecryption=True)
sender = senderSSM['Parameter']['Value']

appidSSM = ssm.get_parameter(Name='LambdaPinPointAPPID', WithDecryption=True)
APPID = appidSSM['Parameter']['Value']

tab = dydb.Table(dtable)
transTab = dydb.Table(tranTab)

# Email Contents for customers
# subject
voucherEmailSubject = "Thank you for contact MRC chatbot!"
# body
voucherEmailBodyHTML = """
<html>
<head></head>
<body>
  <p>Hello <b>{$NAME}</b>,</p>
  <p>Thank you for speaking to me! Please contact me again if you have further questions.</p>
  <br>
  
Regards,<br>
AWS Marketing Response Center<br>
<br>
<img src="./logo.png">
"""

# pinpoint function for customers
def __sendVoucherEmail(email, name, vouchercode=''):
    CHARSET = "UTF-8"
    toAddr = email
   # toAddr = 'yongkue@amazon.my'
    status = 'TQFAIL'
    
    htmlBody = voucherEmailBodyHTML.replace('{$NAME}', name)
    
    if not vouchercode == '':
        status = 'VOUCHERFAIL'
        htmlBody = htmlBody.replace('{$VOUCHER}', "Here is your voucher code for USD 25.00, <b>" + vouchercode + "</b>")
        
    else:
        htmlBody = htmlBody.replace('{$VOUCHER}', "")
    
    try:
        response = client.send_messages(
            ApplicationId=APPID,
            MessageRequest={
                'Addresses': {
                    toAddr: {
                         'ChannelType': 'EMAIL'
                    }
                },
                'MessageConfiguration': {
                    'EmailMessage': {
                        'FromAddress': sender,
                        'SimpleEmail': {
                            'Subject': {
                                'Charset': CHARSET,
                                'Data': voucherEmailSubject
                            },
                            'HtmlPart': {
                                'Charset': CHARSET,
                                'Data': htmlBody
                            }
                        }
                    }
                }
            }
        )
    except ClientError as e:
        print(e.response['Error']['Message'])
    else:
        emailResult = response['MessageResponse']['Result'][toAddr]
        emailRespStatusCode = emailResult['StatusCode']
        if emailRespStatusCode == 200:
            status = 'VOUCHERSENT'
            if vouchercode == '':
              status = 'TQSENT'
              
            print("+++++ Message sent! Message ID: " + response['MessageResponse']['Result'][toAddr]['MessageId'] + ", status=" + status)
    
    return status

# system date
def sysdate():
    return datetime.now().strftime("%Y%m%d%H%M%S")

# customer profile
def getCustProf(mkey):
    localStatusCode = 200
    result = profTab.query(
        IndexName = 'guid-campaignid-index',
        KeyConditionExpression=Key('guid').eq(mkey['guid']) & Key('campaignid').eq(mkey['cid']),
        ProjectionExpression='campaignid, lastname, firstname, email, vouchercode, voucherdate'
    )

    if result['ResponseMetadata']['HTTPStatusCode'] == 200:
        if result['Count'] == 0:
            localStatusCode = 202
            message = "No Data Found"
        else:
            if 'vouchercode' in result['Items'][0] and not result['Items'][0]['vouchercode'] is None:
                localStatusCode = 208
      
            message = result['Items'][0]
    else: 
        localStatusCode = 201
        message = result['ResponseMetadata']
        
    return [localStatusCode, message]

#Lambda handler
def run(event, context):
    print('++++++ EVENT ++++++')
    
    if 'sessionAttributes' in event:
        queryStr = event['sessionAttributes']
    else:
        queryStr = json.loads(event['body'])
    
    toSend = False
    voucherCode = ''
    statusCode = 200
    message = ''
    chatHistory = ""
    
    if not 'guid' in queryStr:
        statusCode = 450
        message = 'Missing GetParams: guid'
    elif not 'cid' in queryStr:
        statusCode = 450
        message = 'Missing GetParams: cid'
    elif not 'sessionId' in queryStr:
        statusCode = 450
        message = 'Missing GetParams: sessionId'
    else:
        print(queryStr)
        lambda_client.invoke(FunctionName="mrcconnectRepNotice",
                    InvocationType='RequestResponse',
                    Payload=json.dumps(event)
                )

        # Getting customer profile
        mkey = queryStr
        statusCode, message = getCustProf(mkey)
        if statusCode in [200, 208]:
            toSend = True
            if statusCode == 200:
                data = "{\"body\": {\"guid\": \"" + mkey['guid'] + "\", \"campaignid\": \"" + mkey['cid'] + "\", \"sessionId\": \"" + mkey['sessionId'] + "\"}}"
                print(data)
                resp = lambda_client.invoke(FunctionName="mrcconnectIssueVoucher",
                    InvocationType='RequestResponse',
                    Payload=json.dumps(data)
                )
                
                result = json.loads(resp.get('Payload').read())
                if result['statusCode'] == 200:
                    voucherCode = result['body']
                    
                
            
            #Reset 208 => 200
            statusCode = 200

        # Trigger pinpoint for customer
        if toSend == True:
            custInfo = message
            campaignid = mkey['cid']
            email = custInfo['email']
            name = custInfo['firstname'] + ' ' + custInfo['lastname']
            
            mailStatus = __sendVoucherEmail(email, name, voucherCode)
            tab.update_item(
                Key={
                    'email': email,
                    'campaignid': campaignid
                },
                UpdateExpression="set #st=:0, updateOn=:1",
                ExpressionAttributeValues={
                    ':0': mailStatus,
                    ':1': sysdate()
                },
                ExpressionAttributeNames={
                    '#st': 'status'
                }
            )
    
    #response for LEX
    res = {
      "dialogAction": {
        "type": "Close",
        "fulfillmentState": "Fulfilled",
        "message": {
          "contentType": "PlainText",
          "content": "Thank you for contacting AWS. The voucher has been sent to you. You can check this in your registered email account."
            }
        }
    }

    return res

'''
Writing Style Web App Release 1
Author: Steven McClusky
Last Updated: April 14, 2019

This app.py implements Flask app to serve website and interact with analyzer.py through POST and GET requests

'''
from flask import Flask, render_template, request
from flask_cors import CORS
import pymysql
import json
import urllib
from analyzer import Analyzer

'''
Initialize variables and set up Flask app to execute web app
'''
app = Flask(__name__, static_url_path='/static', static_folder='www')
# Enable Cross-Origin Resource Sharing (CORS) to allow external website to pull data from this web app
CORS(app)
# Add extension to Flask app to render from template in .pug files
app.jinja_env.add_extension('pypugjs.ext.jinja.PyPugJSExtension')

# MySQL Database connection information
db_user = "wsuser"
db_password = ""
db_host = "ws-db.cxn6r23mlloe.us-east-1.rds.amazonaws.com"


'''
Initialize the connection to MySQL. The function optimize the connection information based on parameters

@param
table - str
user - str
password - str
host - str

@return
pymysql.connection.Connection
'''
def getconnectionDB(table, user, password='', host=None):
    if host == None:
        host = db_host
    if len(password) != 0:
        return pymysql.connect(host=host, user=user, password=password, db=table)
    return pymysql.connect(host=host, user=user, db=table)


'''
The web app home page

@return
response - str
'''
@app.route("/")
def main():
    return render_template('index.pug')

'''
Query to analyze the text through HTML POST request

The params are given by the "request" variable
@params
data - str

@return
json - str
'''
@app.route('/analyze', methods=['POST'])
def analyze():
    writing_sample_data = request.data
    if writing_sample_data is None:
        return '[]'
    writing_sample = writing_sample_data.decode('utf-8')

    if writing_sample is not None and len(writing_sample.strip().split()) > 4:
        anlyzer = Analyzer(writing_sample)
        suggestions = anlyzer.analyze()

        return json.dumps(suggestions)
    else:
        return '[]'


'''
The page comes with several choices for the top informal words and submit the choice for each word

The params are given by the "request" variable
@params
word - str
wordid - str
choice - str

@return
response - str
'''
@app.route("/surveyQuery")
def surveyQuery():
    # Format for return data is
    # id ; current word ; classification word 1 ; classification word 2 ; ...

    # To submit choice
    # id ; current word ; choice classification

    word = request.args.get('word', default='', type=str)
    wordid = request.args.get('wordid', default='', type=str)
    choice = request.args.get('choice', default='', type=str)

    conn = getconnectionDB('corpus', db_user, db_password)
    cursor = conn.cursor(pymysql.cursors.DictCursor)

    if len(choice) != 0 and len(wordid) != 0 and len(word) != 0:
        cursor.execute("SELECT choices from survey_table WHERE `id`=" + wordid)
        data = cursor.fetchone()
        try:
            if data == None or len(data) == 0:
                result = cursor.execute("INSERT INTO survey_table (`id`, `word`, `choices`) VALUES(%s, %s, %s)", (int(wordid), word, choice,))
            else:
                currentChoices = data['choices'] + "," + choice
                result = cursor.execute("UPDATE survey_table SET `choices` = %s WHERE `id` = %s AND `word` = %s", (currentChoices, int(wordid), word,))
        except Exception as e:
            return "error"
        if result == 0:
            return "error"
        conn.commit()

    if len(word) == 0 or len(wordid) == 0:
        wordid = "1"
    else:
        wordid = str(int(wordid) + 1)
    if int(wordid) > 1000:
        conn.close()
        return "done"
    cursor.execute("SELECT word FROM top_informal_words WHERE `id`=" + wordid)
    data = cursor.fetchone()
    currentWord = data['word']

    cursor = conn.cursor(pymysql.cursors.Cursor)
    cursor.execute("SELECT headword FROM thesaurus WHERE `word`='" + currentWord + "'")
    # Convert tuple to list then remove duplicates by change to dict and back to list
    data = list(dict.fromkeys(list(cursor.fetchall())))

    conn.close()

    return wordid + ";" + currentWord + ";" + ";".join(x[0].strip() for x in data)

'''
Query the Database to get all words with the headwordnumber and groupnumber

The params are given by the "request" variable
@params
headwordnumber - str
groupnumber - str

@return
response - str
'''
@app.route("/getwordlist")
def getwordlist():
    headwordnumber = request.args.get('head', default='', type=str)
    groupnumber = request.args.get('group', default='', type=str)
    conn = getconnectionDB('corpus', db_user, db_password)
    # Return data as dictionary
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    cursor.execute("SELECT word FROM thesaurus WHERE `headwordnumber`=" + headwordnumber + " AND `groupnumber`=" + groupnumber)
    # Alternative column
    # cursor.execute("SELECT word FROM thesaurus WHERE `headwordnumber_group`='" + headwordnumber + " - " + groupnumber + "'")
    response = ''
    data = cursor.fetchone()
    while data is not None:
        if response != '':
            response += ','
        response += data['word']
        data = cursor.fetchone()
    if response != '':
        conn.close()
        return response
    conn.close()
    return "notfound"


'''
Query the database to get headwordnumber, groupnumber, and subgroup from the word

The params are given by the "request" variable
@params
wordToFind - str

@return
response - str
'''
@app.route("/getheadlist")
def getheadlist():
    wordToFind = request.args.get('data', default='', type=str)
    conn = getconnectionDB('corpus', db_user, db_password)
    # Return data as dictionary
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    cursor.execute("SELECT * FROM thesaurus WHERE `word`='" + wordToFind + "'")
    data = cursor.fetchone()
    conn.close()
    if data is not None:
        return str(data['headwordnumber']) + "," + str(data['groupnumber']) + "," + str(data['subgroup'])
    return "notfound"


'''
Run the Flask app to serve web app at port 80
'''
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)

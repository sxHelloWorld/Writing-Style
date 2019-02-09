from flask import Flask, render_template, request
import pymysql
import json
import urllib

app = Flask(__name__, static_url_path='/static', static_folder='www')
app.jinja_env.add_extension('pypugjs.ext.jinja.PyPugJSExtension')

db_user = "wsuser"
db_password = ""
db_host = "ws-db.cxn6r23mlloe.us-east-1.rds.amazonaws.com"


def getconnectionDB(table, user, password='', host=None):
    if host == None:
        host = db_host
    if len(password) != 0:
        return pymysql.connect(host=host, user=user, password=password, db=table)
    return pymysql.connect(host=host, user=user, db=table)


@app.route("/")
def main():
    return "Hello docker!"


@app.route("/prototype")
def prototype():
    return render_template('index.pug')


@app.route('/analyze', methods=['POST'])
def analyze():
    writing_sample = request.data
    if writing_sample is not None and len(writing_sample.strip().split()) > 4:
        suggestion1 = {
            'index': 1,
            'type': 'repeated',
            'replaceWords': ['dog', 'cat', 'mouse']
        }
        suggestion2 = {
            'index': 3,
            'type': 'informal',
            'replaceWords': ['watermelon', 'cherry', 'apple']
        }

        return json.dumps([suggestion1, suggestion2])
    else:
        return '[]'


@app.route("/test")
def test():
    conn = getconnectionDB('corpus', db_user, db_password)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM new_table_python")
    data = cursor.fetchall()
    conn.close()
    if len(data) != 0:
        return str(data[0])
    return "Hello docker!"


@app.route("/test2")
def test2():
    return render_template('test2.pug')


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


@app.route("/getAllWordList")
def getAllWordList():
    word = request.args.get('word')


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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)

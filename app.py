from flask import Flask, render_template, request
import pymysql

app = Flask(__name__, static_url_path='/static', static_folder='www')
app.jinja_env.add_extension('pypugjs.ext.jinja.PyPugJSExtension')

@app.route("/")
def main():
    return "Hello docker!"

@app.route("/prototype")
def prototype():
    return render_template('index.pug')

@app.route("/test")
def test():
    user = 'wsuser'
    password = ''
    conn = pymysql.connect(host='ws-db.cxn6r23mlloe.us-east-1.rds.amazonaws.com',user=user, db='corpus')
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM new_table_python")
    data = cursor.fetchall()
    if len(data) != 0:
        return str(data[0])
    return "Hello docker!"

@app.route("/test2")
def test2():
    return render_template('test2.pug')

@app.route("/getheadlist")
def getheadlist():
    user = 'wsuser'
    password = ''
    wordToFind = request.args.get('data', default='', type=str)
    conn = pymysql.connect(host='ws-db.cxn6r23mlloe.us-east-1.rds.amazonaws.com', user=user, db='corpus')
    # Return data as dictionary
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    cursor.execute("SELECT * FROM thesaurus WHERE `word`='" + wordToFind + "'")
    data = cursor.fetchone()
    if data is not None:
        return str(data['headwordnumber']) + "," + str(data['groupnumber']) + "," + str(data['subgroup'])
    return "notfound"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)

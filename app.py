from flask import Flask
import pymysql

app = Flask(__name__)

#app.config['MYSQL_DATABASE_DB'] = 'ws_db'
#app.config['MYSQL_DATABASE_HOST'] = 'ws-db.cxn6r23mlloe.us-east-1.rds.amazonaws.com'

@app.route("/")
def main():
    return "Hello docker!"

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)

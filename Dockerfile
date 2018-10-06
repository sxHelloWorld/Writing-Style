FROM python:3.7-slim
ADD . /code
WORKDIR /code

RUN apt-get update
RUN apt-get install -y build-essential

RUN pip install -r requirements.txt
RUN make all

EXPOSE 80
CMD ["python", "app.py"]

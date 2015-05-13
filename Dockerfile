FROM node:0.10-onbuild

RUN mkdir /uploads

COPY . /src

RUN cd /src; npm install

EXPOSE  8080

VOLUME /uploads

ENV UPLOAD_DIR /uploads

CMD ["node", "/src/index.js"]
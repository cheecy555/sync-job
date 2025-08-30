FROM node:22

WORKDIR /app
COPY . /app/

RUN npm init -y \
    && npm install express fs mssql winston util react-icons readline-sync

EXPOSE 3000
CMD [ "node", "syncjobs.js" ]
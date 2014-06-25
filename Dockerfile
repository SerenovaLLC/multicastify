FROM dockerfile/nodejs

COPY . /multicastify
WORKDIR /multicastify
RUN npm install
CMD node index.js


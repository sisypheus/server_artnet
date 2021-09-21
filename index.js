import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import Fastify from 'fastify';
import * as cors from 'fastify-cors';
import algoliasearch from 'algoliasearch'; 
import { Firestore } from '@google-cloud/firestore';
const path = require('path');
import dotenv from 'dotenv';
dotenv.config();

const fastify = Fastify();
const algolia = algoliasearch(process.env.app_id, process.env.api_key);
const index = algolia.initIndex('user_search');

fastify.register(cors, {
  origin: true,
});

class FirestoreClient {
  constructor() {
    this.db = new Firestore({
      projectId: 'artists-social',
      keyFilename: path.join(path.resolve(), './service-account.json'),
    });
  }
  
  async fetchUserPosts(uid) {
    return this.db.collection('posts')
    .doc(uid)
    .collection('userPosts')
    .orderBy('created', 'desc')
    .get()
    .then(snapshot =>
      snapshot  
      )
    }
    
    async fetchAllPosts() {
      return this.db.collectionGroup('userPosts')
      .orderBy('created', 'desc')
      .get()
      .then(snapshot => snapshot).catch(err => err);
    }
    
    async deleteRecursive(doc) {
      this.db.recursiveDelete(doc).then(() => {
        return true
      }).catch((err) => {
        return err
      });
    }
    
    async updateUserData(doc) {
      const userRef = this.db.doc(`users/${doc.uid}`);
      return userRef.set(doc, { merge: true }).then(() => {
        return userRef;
      }).catch((err) => {
        return err;
      });
    }
}
  
const store = new FirestoreClient();
//fastify routes//

fastify.post('/create/user', async (req, res) => {
  store.updateUserData(req.body).then((ref) => {
    const objectID = ref.id;
    const toIndex = req.body;
    index.saveObject({
      objectID,
      ...toIndex,
    }).catch(err => console.log(err));
    res.code(200);
  }).catch(err => {
    console.log(err);
    res.code(500).send(err);
  });
});

fastify.delete('/delete/user/', async (req, res) => {
  const doc = store.db.doc(req.body.user);
  store.deleteRecursive(doc).then(() => {
    index.deleteObject(doc.id);
    res.code(200).send();
  }).catch(err => {
    console.log(err);
    res.status(500).send(err);
  });
})

fastify.delete('/delete/recursive/', async (req, res) => {
  const doc = store.db.doc(req.body.document);
  console.log(doc);
  store.deleteRecursive(doc).then(() => {
    res.status(200);
  }).catch(err => {
    res.status(404).send(err);
  });
});

//search
fastify.get('/search/user/:user', async (req, res) => {
  index.search(req.params.user).then((results) => {
    const objects = results.hits.map(element => {
      return {
        displayName: element.displayName,
        email: element.email,
        uid: element.uid,
        photoUrl: element.photoUrl || null,
      }
    });
    res.status(200).send(objects);
  })
});

fastify.get('/', () => {
  return 'Server is up and running';
});

fastify.listen(process.env.PORT || 3000, () => {
  console.log(`server listening on port 3000`);
});
var Datastore = require('nedb')
  , db = new Datastore({ filename: 'together.db', autoload: true });


var doc =
  [
    {
      name:'sadegh',
      password:'123'
    },
    {
      name:'sadegh',
      password:'123'
    }
  ];

db.insert(doc, function (err, newDoc) {   // Callback is optional
  // newDoc is the newly inserted document, including its _id
  // newDoc has no key called notToBeSaved since its value was undefined
});

db.count({}, function (err, count) {
  // count equals to 3
  console.log(count);
});

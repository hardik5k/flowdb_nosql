const express = require('express')
const app = express()
const fileUpload = require("express-fileupload");
const cors = require('cors');
const { MongoClient } = require('mongodb');
const pkg = require('csvtojson');
const bodyParser = require('body-parser');
const {csv} = pkg;
let count = 1;
const dtypeToMongo = {
  "String":"string",
  "Integer":"int",
  "Double":"double",
  "Boolean":"bool",
  "Object":"object",
  "Date":"date",
}
app.use(cors()); 
app.use(bodyParser.json());
app.use(fileUpload()) // Enable CORS for all routes
app.post('/upload', (req, res)=>{
  const filename = req.files.files.name;
  const file = req.files.files;
  let uploadPath = __dirname+"/uploads/" + filename;
  console.log(file)
  file.mv(uploadPath, (err) => {
    if (err) {
      return res.json(err);
    }
    else{
      csv()
      .fromFile(uploadPath)
      .then((jsonObj) => {
        insertValues(getClient(), jsonObj).catch(console.dir).then(()=>{
          queryValues(getClient()).catch(console.dir).then((columnNames) => {
            res.json({'keys':columnNames})
          });
          // console.log(columnNames)
          // const columnsObj = { columns: columnNames.split(',').map(col => col.trim()) };
          // const jsonObj = JSON.parse(jsonString);
          // console.log(jsonObj); 
        });
      });
      // res.json(200)
    }
  });
})
app.post('/query', (req, res)=>{
  console.log(req.body);
  const request = req.body;
  console.log(request[0].type)
  if(request[0].type == 1){
    console.log("Calling select query handler...");
    selectQuery(getClient(), request[0]).then((result)=>{
      res.json({"result": result});
    })
  }
  else{
    console.log("Calling aggregate query handler...")
    aggregateQuery(getClient(), request[0]).then((result)=>{
      res.json({"result": result});
    })
  }
  // res.json({"message":"gg"});
})


app.post('/schema', (req, res)=>{
    structure = []
    const data = req.body;
    const promises = data.map((dataItem) =>{
      const result = dataItem.reduce((acc, obj) => {
        Object.entries(obj).forEach(([key, value]) => {
          if (!acc[key]) acc[key] = [];
          acc[key].push(value);
        });
        return acc;
      }, {});
      console.log(result)
      count+=1
      return buildCollection(getClient(), result, count).then((name)=>{
        console.log("running constraints...")
        return runConstraints(getClient(), dataItem, name).then((struct)=>{
          structure.push(struct);
          console.log(struct)
          console.log("Okay done!");
          return struct;
        })
      })
    })
    Promise.all(promises).then(() => {
      res.json({"data": structure})
    }).catch((error) => {
      console.error(error);
      res.status(500).json({"error": "Something went wrong."});
    });
})


const port = 4000
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});

function getClient() {
const uri = "mongodb://0.0.0:27017/";
return new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
}


async function queryValues(client){
  try{
      const database = client.db("testDB");
      const table = database.collection("temporary");
      const obj = await table.findOne();
      const keys = Object.keys(obj);
      return keys
  } finally{
      await client.close();
  }
  }


async function insertValues(client, documents) {
  try {
      const database = client.db("testDB");
      const table = database.collection("temporary");
      // create a document to insert
      const result = await table.insertMany(documents);
      console.log(`A document was inserted with the _id: ${result.insertedId}`);
  } finally {
      await client.close();
  }  
}

async function buildCollection(client, columns, count) {
  try {
      const database = client.db("testDB");
      const haiku = database.collection("temporary");
      const collectionName = "schema"+count;
      const name = database.collection(collectionName);
      // await name.insertOne({});
      const projection = columns.columnName.reduce((acc, curr) => ({ ...acc, [curr]: 1 }), {});

      // This is to validate the structure of the collection

      // const property = {};
      // // const typ = columns.dataType.map(DataType => ({ bsonType: DataType }));
      // const typ = {bsonType: 'string'}
      // // Loop through each column name and add its data type to the properties object
      // console.log(typ);
      // columns.columnName.forEach((columnName, index) => {
      //   property[columnName] = typ;
      // });
      // console.log(property)
      // const s = {
      //   $jsonSchema: {
      //   bsonType: "object",
      //   required: columns.columnName,
      //   properties: property,
      //   }
      // };
      // console.log(s)
      // const val = {validator:s}

      const data = await haiku.find({}, {projection}).toArray()
      await name.insertMany(data, (err) =>{
          if (err) throw err;
      })
      for(let i=0; i<columns.columnName.length; i++){
        if(columns.columnName[i] == columns.tempColName[i]) continue;
        const res = await name.updateMany(
          {}, {$rename: {[columns.columnName[i]]:columns.tempColName[i]}}
        )
        console.log(res)
      }

      proj = {}
      // for(let i=0; i<columns.dataType.length; i++){
      //   if(columns.dataType[i] == "Integer"){
      //     columns.dataType[i] = "double"
      //   }
      //   if(columns.dataType[i] =="Boolean"){
      //     columns.dataType[i] = "bool"
      //   }
      //   if(columns.dataType[i] =="String"){
      //     columns.dataType[i] = "string"
      //   }
      //   if(columns.dataType[i] =="Object"){
      //     columns.dataType[i] = "object"
      //   }
      //   if(columns.dataType[i] =="Date"){
      //     columns.dataType[i] = "date"
      //   }
      // }
      for(let i=0; i<columns.tempColName.length; i++){
        console.log(columns.tempColName[i])
        proj[columns.tempColName[i]] = {$convert: {input: `$${columns.tempColName[i]}`, to: dtypeToMongo[columns.dataType[i]], onError: null}}
      }
      const pipeline = [{
          $project: proj
    }];

      // Run the aggregation pipeline and update the collection
      const results = await name.aggregate(pipeline).toArray(); // Print the converted documents
      // console.log(results)
        // Replace the old documents with the converted documents
      await name.deleteMany({})
      await name.insertMany(results, (err)=>{
        if(err) throw err;
      });
      return collectionName;
  } finally {
      await client.close();
  }
}

async function runConstraints(client, columns, collectionName) {
  try {
    const database = client.db("testDB");
    // const collectionName = "schema"+count;
    const name = database.collection(collectionName);
    console.log(collectionName)

    for (let i = 0; i < columns.length; i++) {
      const item = columns[i];

      if (item.nc == 1 && item.replaceWith == "delete") {
        try {
          console.log("Deleting NULLs for" + item.tempColName)
          const query = { [item.tempColName]: { $type: "null" } };
          const result = await name.deleteMany(query);
          console.log(result)
        } catch (err) {
          console.error(err);
        }
      }
      if(item.nc == 1 && item.replaceWith == "mean"){
        try{
          console.log("Replacing mean for " + `$${item.tempColName}`)
          const avgResult = await name.aggregate([
            {
              $group: {
                _id: null,
                avgValue: { $avg: `$${item.tempColName}`.toString() }
              }
            },
            {
              $project: {
                _id: 0,
                avgValue: 1
              }
            }
          ]).toArray();
          console.log(avgResult)
          const result = await name.updateMany(
            { [item.tempColName]:{ $type: "null" } },
            { $set: {[item.tempColName]: avgResult[0].avgValue } }
          );
          console.log(`${result.modifiedCount} documents updated.`);
          
        }catch(err){
          console.error(err);
        }
      }
      if(item.nc == 1 && item.replaceWith != "none"){
        try{
          const temp = parseInt(item.replaceWith);
          console.log("Replacing NULL With " + temp)
          const result = await name.updateMany(
            { [item.tempColName]:null },
            { $set: {[item.tempColName]: temp} }
          );
          console.log(result);
        }catch(err){
          console.error(err);
        }
        
      }
      if (item.uc == 1) {
        try {
          const duplicates = await name
            .aggregate([
              {
                $group: {
                  _id: { field1: `$${item.tempColName}` },
                  count: { $sum: 1 },
                  docs: { $push: "$_id" },
                },
              },
              {
                $match: {
                  count: { $gt: 1 },
                },
              },
              {
                $unwind: "$docs",
              },
            ])
            .toArray();

          const deletePromises = duplicates.map(({ docs }) =>
            name.deleteOne({ _id: docs })
          );
          await Promise.all(deletePromises);
          console.log("Duplicates removed");
        } catch (err) {
          console.error(err);
        }
      }
    }
    const sampleDoc = await name.findOne({});
    const columnNames = Object.keys(sampleDoc);
    console.log(columnNames)
    const prop = {[collectionName]:columnNames}
    console.log(prop)
    return prop;
  } finally {
    await client.close();
  }
}

async function aggregateQuery(client, request){
  try{
    const database = client.db("testDB");
    console.log(request.tableName);
    const name = database.collection(request.tableName);
    let result;
    switch(request.condition){
      case "min": result = await name.find().sort({ [request.columnName]: 1 }).limit(1).toArray();
                  break;
      case "max": result = await name.find().sort({ [request.columnName] :-1}).limit(1).toArray();
                  break;
      case "count": result = await name.count();
                    break;
      case "range": const temp1 = await name.find().sort({ [request.columnName] :-1}).limit(1).toArray();
                    const temp2 = await name.find().sort({ [request.columnName] :1}).limit(1).toArray();
                    const res = []
                    res.push(temp2);
                    res.push(temp1);
                    result = res;
      case "nunique": const distinctValues = await name.distinct(request.columnName);
                      result = distinctValues.length;
      case "avg": const temp = await name.aggregate([{$group: {_id: null,avgValue: { $avg: `$${request.columnName}` }}}]).toArray();
                  result = temp[0].avgValue;
     
    }
    console.log(result);
    return result;
  }finally{
    await client.close();
  }
}


async function selectQuery(client, request){
  try{
    const database = client.db("testDB");
    console.log(request.tableName);
    const name = database.collection(request.tableName);
    let query = {};
    let result;
    let percentile;
    let totalDocsCount;
    let percentileIndex;
    switch(request.condition){
      case "=": query = {};
                query[request.columnName] = parseInt(request.rhs);
                console.log(query)
                result = await name.find(query).limit(parseInt(request.limit)).toArray();
                console.log(result)
                break;
      case ">": query = {};
                query[request.columnName] = { $gt: parseInt(request.rhs) };
                console.log(query);
                result = await name.find(query).limit(parseInt(request.limit)).toArray();
                console.log(result);
                break;
      case ">=": query = {};
      query[request.columnName] = { $gte: parseInt(request.rhs) };
                console.log(query);
                result = await name.find(query).limit(parseInt(request.limit)).toArray();
                console.log(result);
                break;
                case "<": query = {};
                query[request.columnName] = { $lt: parseInt(request.rhs) };
                console.log(query);
                result = await name.find(query).limit(parseInt(request.limit)).toArray();
                console.log(result);
                break;
      case "<=": query = {};
      query[request.columnName] = { $lte: parseInt(request.rhs) };
      console.log(query);
      result = await name.find(query).limit(parseInt(request.limit)).toArray();
      console.log(result);
      break;
      case "!=": query = {};
                query[request.columnName] = { $ne: parseInt(request.rhs) };
                console.log(query);
                result = await name.find(query).limit(parseInt(request.limit)).toArray();
                console.log(result);
                break;
      case "> 75%": query = {};
      percentile = 0.75;
      query[request.columnName] = { $ne: null };
      totalDocsCount = await name.count(query);
      percentileIndex = Math.ceil(totalDocsCount * percentile);
      result = await name.find(query).sort({ [request.columnName]: 1 }).skip(percentileIndex).limit(parseInt(request.limit)).toArray();
      case "< 25%": query = {};
      percentile = 0.25;
      query[request.columnName] = { $ne: null };
                    totalDocsCount = await name.count(query);
                    percentileIndex = Math.ceil(totalDocsCount * percentile);
                    result = await name.find(query).sort({ [request.columnName]: 1 }).skip(percentileIndex).limit(parseInt(request.limit)).toArray();                   

    }

    console.log(result);
    console.log("The limit is " + request.limit)
    console.log("The rhs is" + request.rhs)
    return result;

  }finally{
    await client.close();
  }
}
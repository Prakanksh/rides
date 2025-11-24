const mongoose = require('mongoose')
async function initialize (msg) {
  try {
    const srv = `mongodb+srv://nagpalprakankshabvpy_db_user:qwertyuiop@cluster0.n7rle9y.mongodb.net/rides?retryWrites=true&w=majority`

    console.log("@@@@@@@@" , srv);
    // mongodb+srv://nagpalprakankshabvpy_db_user:qwertyuiop@cluster0.n7rle9y.mongodb.net/?appName=Cluster0
    
    await mongoose.connect(srv, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    console.log('+ MongoDB is connected!! +', srv)
  } catch (error) {
    console.log('error', error)
    console.error(error)
  }
}

module.exports.initialize = initialize

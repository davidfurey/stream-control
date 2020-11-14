import { requestAuthorization } from '../google-oauth'

console.log("Checking if auth has been completed for youtube")
console.log("If youtube authentication is required, make sure that you select the youtube brand account")
requestAuthorization("youtube").then((message) => {
  console.log(message)
  console.log("Checking if auth has been completed for spreadsheets")
  requestAuthorization("spreadsheets").then((message) => {
    console.log(message)
    console.log("Checking if auth has been completed for drive")
    requestAuthorization("drive").then((message) => {
      console.log(message)
    })
  })
})
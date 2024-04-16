var express = require("express");
var app = express();
const axios = require('axios');
const OrderInfoRequest = require("shipday/integration/order/request/order.info.request");
const PaymentMethod = require("shipday/integration/order/types/payment.method");
const CardType = require("shipday/integration/order/types/card.type");
const OrderItem = require("shipday/integration/order/request/order.item");
const Shipday = require("shipday/integration");
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
require('dotenv').config()
const mondaySdk = require('monday-sdk-js');
const monday = mondaySdk();

app.get("/", function (req, res) {
  res.send('Shipday Server running here')
});

app.post("/move-order-to-shipday", function (req, res) {
  console.log("moving order");
  console.log(req.body);
  let payload = req.body;

  if (!payload) {
    return res.status(400).send("Bad request: No payload provided.");
  }

  let storeApi = `SHIPDAY_API_${payload.merchant_id}`;

  axios.post('https://hooks.zapier.com/hooks/catch/18380139/3x77ghl/', payload)
    .then(response => {
      console.log('Webhook sent to Zapier:', response.data);
      // res.sendStatus(200);
    })
    .catch(error => {
      console.error('Error sending webhook to Zapier:', error);
      // res.sendStatus(500);
    });

  const shipdayClient = new Shipday(process.env[storeApi] || process.env.MAIN_SHIPDAY_API, 10000);

  let deliveryTime = payload.job_delivery_datetime?.split(' ');
  if (!deliveryTime) {
    console.error("Invalid delivery time format.");
    return res.status(400).send("Bad request: Invalid delivery time format.");
  }
  let pickupTime = payload.job_pickup_datetime?.split(' ');
  if (!pickupTime) {
    console.error("Invalid pickup time format.");
    return res.status(400).send("Bad request: Invalid pickup time format.");
  }

  const orderInfoRequest = new OrderInfoRequest(
    payload.job_id,
    payload.merchant_address === payload.job_address ? payload.merchant_name : payload.customer_username,
    payload.job_address,
    payload.merchant_address === payload.job_address ? payload.merchant_email : payload.customer_email,
    payload.merchant_address === payload.job_address ? payload.merchant_phone_number : payload.customer_phone,
    payload.merchant_address === payload.job_address ? payload.customer_username : payload.merchant_name,
    payload.job_pickup_address,
  );

  orderInfoRequest.setRestaurantPhoneNumber(payload.merchant_address === payload.job_address ? payload.job_pickup_phone : payload.merchant_phone_number);
  orderInfoRequest.setExpectedDeliveryDate(convertDateFormat(deliveryTime[0]));
  orderInfoRequest.setExpectedDeliveryTime(convertTo24Hour(deliveryTime[1] + " " + deliveryTime[2]));
  orderInfoRequest.setExpectedPickupTime(convertTo24Hour(pickupTime[1] + " " + pickupTime[2]));
  orderInfoRequest.setPickupLatLong(payload.job_pickup_latitude, payload.job_pickup_longitude);
  orderInfoRequest.setDeliveryLatLong(payload.job_latitude, payload.job_longitude);
  
  if(payload.tip !== 0){
    orderInfoRequest.setTips(payload.tip);
  }
  if(payload.tax !== 0){
    orderInfoRequest.setTax(payload.tax);
  }
  if(payload.job_description !== ""){
    orderInfoRequest.setDeliveryInstruction(
      payload.job_description
    );
  }
  orderInfoRequest.setTotalOrderCost(payload.total_order_amount);
  const paymentOption = PaymentMethod.CREDIT_CARD;
  const cardType = CardType.AMEX;

  orderInfoRequest.setPaymentMethod(paymentOption);
  orderInfoRequest.setCreditCardType(cardType);

  const itemsArr = [];

  payload.orderDetails?.forEach(detail => {
    const productName = detail?.product?.product_name;
    const price = detail?.product?.unit_price;
    const quantity = detail?.product?.quantity;
    
    if (productName && price && quantity) {
      itemsArr.push(new OrderItem(productName, price, quantity));
    } else {
      console.error("Invalid order detail format:", detail);
    }
  });
  orderInfoRequest.setOrderItems(itemsArr);
  shipdayClient.orderService
    .insertOrder(orderInfoRequest)
    .then((response) => {
      console.log(response);
      res.send("Shipway Order Created");
    })
    .catch((error) => {
      console.error("Error creating Shipway order:", error);
      res.status(500).send("Internal Server Error");
    });
});

app.post("/edit-order-on-Monday", function(req, res) {
  console.log("updating order");
  console.log(req.body);
  let payload = req.body;

  if (!payload || !payload.job_id) {
    return res.status(400).send('Bad request: Missing job ID in payload.');
  }

  const apiToken = process.env.MONDAY_API_KEY;
  monday.setToken(apiToken)
  const testQuery = 
  `query {
    items_page_by_column_values (limit: 50, board_id: 6343774897, columns: [{column_id: "name", column_values: ["${payload.job_id}"]}]) {
      items {
        id
      }
    }
  }`
  monday.api(testQuery)
  .then(response => {
    const itemId = response?.data?.items_page_by_column_values?.items[0]?.id
    console.log(response)
    if(itemId){
      payload.columnId = itemId;
      console.log('coulmn id is', payload.columnId)

      axios.post('https://hooks.zapier.com/hooks/catch/18380139/3poxutk/', payload)
      .then(response => {
        console.log('Webhook sent to Zapier:');
        res.sendStatus(200);
      })
      .catch(error => {
        console.error('Error sending webhook to Zapier:', error);
        res.sendStatus(500);
      });
      return;
    } else {
      console.error('Item not found on Monday board');
      res.status(404).send('Item not found on Monday board');
    }
  })
  .catch(error => {
    console.error('Error updating item:', error);
    res.status(500).send('Internal Server Error');
  });

  // Test Code ends her
  // axios.post(process.env.XPRESSRUN_URL, payload, {
  //   headers: {
  //       'X-Yelo-Token': process.env.XPRESSRUN_TOKEN,
  //       'Content-Type': 'application/json'
  //   }
  // })
  // .then(response => {
  //     console.log('Request sent to Xpressrun API:', response.data);
  //     // Handle response as needed
  // })
  // .catch(error => {
  //     console.error('Error sending request to Xpressrun API:', error);
  //     // Handle error as needed
  // });
  // res.send("Order Edited");
})

function convertDateFormat(dateString) {
  const dateParts = dateString.split('/');
  const formattedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
  
  return formattedDate;
}

function convertTo24Hour(time12h) {
  const [time, period] = time12h.split(' ');

  let [hours, minutes] = time.split(':');

  hours = parseInt(hours);
  minutes = parseInt(minutes);

  if (period.toLowerCase() === 'pm' && hours < 12) {
      hours += 12;
  } else if (period.toLowerCase() === 'am' && hours === 12) {
      hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}


app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});

module.exports = app;

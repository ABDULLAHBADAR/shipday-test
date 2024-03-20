var express = require("express");
var app = express();
const OrderInfoRequest = require("shipday/integration/order/request/order.info.request");
const PaymentMethod = require("shipday/integration/order/types/payment.method");
const CardType = require("shipday/integration/order/types/card.type");
const OrderItem = require("shipday/integration/order/request/order.item");
const Shipday = require("shipday/integration");
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const shipdayClient = new Shipday("WuXwwegAED.omJw6xaviZvhp5kn1fpz", 10000);

app.get("/", function (req, res) {
  res.send('Shipday Server running here')
});

app.post("/move-order-to-shipday", function (req, res) {
  console.log("moving order");
  console.log(req.body);
  console.log(req.body.orderDetails)
  let payload = req.body;

  let deliveryTime = payload.job_delivery_datetime.split(' ');
  const orderInfoRequest = new OrderInfoRequest(
    payload.job_id,
    payload.merchant_address == payload.job_address ? payload.merchant_name : payload.customer_username,
    payload.job_address,
    payload.merchant_address == payload.job_address ? payload.merchant_email : payload.customer_email,
    payload.merchant_address == payload.job_address ? payload.merchant_phone_number : payload.customer_phone,
    payload.merchant_address == payload.job_address ? payload.customer_username : payload.merchant_name,
    payload.job_pickup_address,
  );

  orderInfoRequest.setRestaurantPhoneNumber(payload.merchant_address == payload.job_address ? payload.job_pickup_phone : payload.merchant_phone_number);
  orderInfoRequest.setExpectedDeliveryDate(convertDateFormat(deliveryTime[0]));
  orderInfoRequest.setExpectedDeliveryTime(convertTo24Hour(deliveryTime[1] + " " + deliveryTime[2]));
  orderInfoRequest.setPickupLatLong(payload.job_pickup_latitude, payload.job_pickup_longitude);
  orderInfoRequest.setDeliveryLatLong(payload.job_latitude, payload.job_longitude);
  if(payload.tip != 0){
    orderInfoRequest.setTips(payload.tip);
  }
  if(payload.tax != 0){
    orderInfoRequest.setTax(payload.tax);
  }
  if(payload.job_description != ""){
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

  payload.orderDetails.forEach(detail => {
    const productName = detail.product.product_name;
    const price = detail.product.unit_price;
    const quantity = detail.product.quantity;
    
    itemsArr.push(new OrderItem(productName, price, quantity));
  });
  orderInfoRequest.setOrderItems(itemsArr);
  shipdayClient.orderService
    .insertOrder(orderInfoRequest)
    .then((res) => {
      console.log("no error found");
      console.log(res);
    })
    .catch((e) => {
      console.log("error found");
      console.log(e);
    });

  res.send("Hello World!");
});

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

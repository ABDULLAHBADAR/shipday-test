var express = require("express");
var app = express();
const OrderInfoRequest = require("shipday/integration/order/request/order.info.request");
const PaymentMethod = require("shipday/integration/order/types/payment.method");
const CardType = require("shipday/integration/order/types/card.type");
const OrderItem = require("shipday/integration/order/request/order.item");
const Shipday = require("shipday/integration");

const shipdayClient = new Shipday("WuXwwegAED.omJw6xaviZvhp5kn1fpz", 10000);

app.get("/", function (req, res) {
  console.log("done");
  res.send("Hello World!");
});

app.post("/move-order-to-shipday", function (req, res) {
  console.log("moving order");
  console.log(req.body);
  const orderInfoRequest = new OrderInfoRequest(
    "99qT5A",
    "Mr. Jhon Mason",
    "556 Crestlake Dr, San Francisco, CA 94132, USA",
    "jhonMason@gmail.com",
    "+14152392212",
    "Popeyes Louisiana Kitchen",
    "890 Geneva Ave, San Francisco, CA 94112, United States"
  );

  orderInfoRequest.setRestaurantPhoneNumber("+14152392013");
  orderInfoRequest.setExpectedDeliveryDate("2024-06-03");
  orderInfoRequest.setExpectedDeliveryTime("17:45:00");
  orderInfoRequest.setExpectedPickupTime("19:22:00");
  orderInfoRequest.setPickupLatLong(41.53867, -72.0827);
  orderInfoRequest.setDeliveryLatLong(41.55467, -72.0927);
  orderInfoRequest.setTips(2.5);
  orderInfoRequest.setTax(1.5);
  orderInfoRequest.setDiscountAmount(1.5);
  orderInfoRequest.setDeliveryFee(3);
  orderInfoRequest.setTotalOrderCost(32.47);
  orderInfoRequest.setDeliveryInstruction("Please leave the items by the door");
  orderInfoRequest.setOrderSource("Seamless");
  orderInfoRequest.setAdditionalId("4532");
  orderInfoRequest.setClientRestaurantId(12);

  const paymentOption = PaymentMethod.CREDIT_CARD;
  const cardType = CardType.AMEX;

  orderInfoRequest.setPaymentMethod(paymentOption);
  orderInfoRequest.setCreditCardType(cardType);

  const itemsArr = [];
  itemsArr.push(new OrderItem("Double Cheese Burger", 23, 1));

  itemsArr.push(new OrderItem("Coke", 5, 1));

  orderInfoRequest.setOrderItems(itemsArr);

  shipdayClient.orderService
    .insertOrder(orderInfoRequest)
    .then((res) => {
      console.log('no error found')
      console.log(res)
    })
    .catch((e) => {
      console.log("error found")
      console.log(e)
    });

  res.send("Hello World!");
});

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});

module.exports = app;

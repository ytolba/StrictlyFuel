import { Product } from "../types";
var ProductAdvertisingAPIv1 = require("paapi5-react-native-sdk");

var defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
// Using environment variables for credentials (security best practice)
defaultClient.accessKey = process.env.AMAZON_ACCESS_KEY;
defaultClient.secretKey = process.env.AMAZON_SECRET_KEY;
defaultClient.host = "webservices.amazon.com";
defaultClient.region = "us-east-1";

var api = new ProductAdvertisingAPIv1.DefaultApi();
var callback = function (error, data, response) {
  if (error) {
    console.log('Error calling PA-API 5.0!');
    console.log('Printing Full Error Object:\n' + JSON.stringify(error, null, 1));
    console.log('Status Code: ' + error['status']);
    if (error['response'] !== undefined && error['response']['text'] !== undefined) {
      console.log('Error Object: ' + JSON.stringify(error['response']['text'], null, 1));
    }
  } else {
    console.log('API called successfully.');
    var searchItemsResponse = ProductAdvertisingAPIv1.SearchItemsResponse.constructFromObject(data);
    console.log('Complete Response: \n' + JSON.stringify(searchItemsResponse, null, 1));
    if (searchItemsResponse['SearchResult'] !== undefined) {
      console.log('Printing First Item Information in SearchResult:');
      var item_0 = searchItemsResponse['SearchResult']['Items'][0];
      if (item_0 !== undefined) {
        if(item_0['ASIN'] !== undefined) {
          console.log('ASIN: ' + item_0['ASIN']);
        }
        if (item_0['DetailPageURL'] !== undefined) {
          console.log('DetailPageURL: ' + item_0['DetailPageURL']);
        }
        if (item_0['ItemInfo'] !== undefined && item_0['ItemInfo']['Title'] !== undefined && item_0['ItemInfo']['Title']['DisplayValue'] !== undefined) {
          console.log('Title: ' + item_0['ItemInfo']['Title']['DisplayValue']);
        }
        if (item_0['Offers'] !== undefined && item_0['Offers']['Listings'] !== undefined && item_0['Offers']['Listings'][0]['Price'] !== undefined && item_0['Offers']['Listings'][0]['Price']['DisplayAmount'] !== undefined) {
          console.log('Buying Price: ' + item_0['Offers']['Listings'][0]['Price']['DisplayAmount']);
        }
      }
    }
    if (searchItemsResponse['Errors'] !== undefined) {
      console.log('Errors:');
      console.log('Complete Error Response: ' + JSON.stringify(searchItemsResponse['Errors'], null, 1));
      console.log('Printing 1st Error:');
      var error_0 = searchItemsResponse['Errors'][0];
      console.log('Error Code: ' + error_0['Code']);
      console.log('Error Message: ' + error_0['Message']);
    }
  }
};

export const fetchAmazonProducts = async (
  category: string
): Promise<Product[]> => {
  const products: Product[] = [];

  return new Promise((resolve, reject) => {
    try {
      var searchItemsRequest = new ProductAdvertisingAPIv1.SearchItemsRequest();
      searchItemsRequest["PartnerTag"] = "strictlybased-20"; // Your Amazon associate tag
      searchItemsRequest["PartnerType"] = "Associates";
      searchItemsRequest["Keywords"] = category; // Category passed as keyword
      searchItemsRequest["SearchIndex"] = "All"; // All product categories
      searchItemsRequest["ItemCount"] = 5; // Fetch 5 items, adjust as needed
      searchItemsRequest["Resources"] = [
        "Images.Primary.Medium",
        "ItemInfo.Title",
        "Offers.Listings.Price",
      ];

      console.log("start request");

      // API Call with modified callback
      api.searchItems(searchItemsRequest, (error, data, response) => {
        if (error) {
          console.error("Error calling PA-API 5.0!", error);
          reject(error); // Reject promise if API call fails
        } else {
          console.log("API called successfully.");
          var searchItemsResponse = ProductAdvertisingAPIv1.SearchItemsResponse.constructFromObject(data);
          
          if (searchItemsResponse['SearchResult'] !== undefined) {
            console.log('Processing Search Results...');
            searchItemsResponse['SearchResult']['Items'].forEach((item: any) => {
              if (item.ItemInfo?.Title?.DisplayValue && item.Offers?.Listings?.[0]?.Price?.DisplayAmount) {
                products.push({
                  title: item.ItemInfo.Title.DisplayValue,
                  price: item.Offers.Listings[0].Price.DisplayAmount,
                  image: item.Images?.Primary?.Medium?.URL || "",
                  reviews: item.CustomerReviews?.Count || 0,
                  link: item.DetailPageURL, // Link to product page
                });
              }
            });
          }

          // Resolve promise with populated products array
          resolve(products);
        }
      });
    } catch (error) {
      console.error("Error fetching Amazon products: ", error);
      reject(error);
    }
  });
};


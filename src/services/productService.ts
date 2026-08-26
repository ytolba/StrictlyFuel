import {
    collection,
    query,
    orderBy,
    getDocs,
  } from "firebase/firestore";
  import { db } from "../firebaseConfig";
  import { productItem } from "../types/product";
  
  export const getProducts = async (): Promise<productItem[]> => {
    try {
      console.log("Fetching products...");
      
      // Reference to the "products" collection
      const productsRef = collection(db, "products");
      
      // Query to order products by timestamp (or createdAt if preferred)
      const q = query(productsRef, orderBy("createdAt", "desc"));
      
      // Execute the query
      const querySnapshot = await getDocs(q);
      console.log("Found products:", querySnapshot.size);
      
      // Map the results to a productItem array
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          imageUrl: data.imageUrl || "", // Handle missing imageUrl
          createdAt: data.createdAt || "",
          description: data.description || "",
          link: data.link || "",
          title: data.title || "",
          price: data.price || 0,
        } as productItem;
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      throw new Error(`Failed to fetch products: ${error}`);
    }
  };
  

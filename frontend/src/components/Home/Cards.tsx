import React from 'react';

const Cards = () => {
  return (
    <>
      <div className="text-center">
        <h1 className="text-black-400 text-2xl">
          Cheap Flight Tickets <span className="text-gray-600 text-2xl">Prices are at FareClubs!</span>
        </h1>
      </div>

      {/* Wrapper to center the gray background div */}
      <div className="flex justify-center mt-5">
        <div className="bg-gray-200 inline-block rounded-lg w-full sm:w-4/5 lg:w-3/4 p-2 mx-auto">
          <h2 className="mt-3 text-2xl text-left non-italic ml-2">Promotional Offers</h2>

          {/* First Set of Cards (1-3) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 mt-2 mx-2">
            {[
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGv5BV3XCf-uIqPL_BpNVBCvsZT2PPFCogtA&s",
              "https://gos3.ibcdn.com/top-1569824183.jpg",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRG-EQb9e2AKAJKgDDvMJnpmTqplTzyMRJx8w&s",
            ].map((src, index) => (
              <div
                key={index}
                className="card bg-base-100 image-full w-full max-w-none shadow-xl hover:scale-105 transform transition duration-300 ease-in-out"
              >
                <figure>
                  <img src={src} className="w-full h-60 object-cover rounded-lg" alt="Flight Destination" />
                </figure>
              </div>
            ))}
          </div>

          <h2 className="mt-4 text-2xl text-left non-italic ml-2">Holiday Packages</h2>

          {/* Second Set of Cards (4-6) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 mt-4 mx-2">
            {[
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzlVR9yR4vBii20Kd9juIEA5DPEwHyB8_Mwg&s",
              "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?cs=srgb&dl=pexels-jaime-reimer-1376930-2662116-2662116.jpg&fm=jpg",
              "https://plus.unsplash.com/premium_photo-1673971706769-13a9499e3794?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZGVzdGluYXRpb258ZW58MHx8MHx8fDA%3D",
            ].map((src, index) => (
              <div
                key={index}
                className="card bg-base-100 image-full w-full max-w-none shadow-xl hover:scale-105 transform transition duration-300 ease-in-out"
              >
                <figure>
                  <img src={src} className="w-full h-60 object-cover rounded-lg" alt="Flight Destination" />
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h1 className="text-black-400 text-2xl mt-5 text-center">
        Cheap Flight Tickets <span className="text-gray-600 text-2xl">Prices are at FareClubs!</span>
      </h1>
    </>
  );
};

export default Cards;

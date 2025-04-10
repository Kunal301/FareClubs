export default function Footer() {
  const cards = [
    {
      image: "https://png.pngtree.com/background/20230525/original/pngtree-human-resources-hiring-manager-with-human-search-in-background-with-people-picture-image_2728908.jpg",
      title: "More Than 25 Million Monthly Visitors",
      description: "Thanks to its easy-to-use and secure payment infrastructure where you can compare hundreds of flights, obilet.com serves millions of users every month.",
    },
    {
      image: "https://img.freepik.com/premium-psd/red-circle-with-clock-it-that-says-verizon_680596-2979.jpg",
      title: "Book Your Ticket in 2 Minutes",
      description: "Creating the opportunity to compare numerous companies with its easy-to-use and secure payment infrastructure, obilet enables everyone to find a flight ticket suitable for their budget in 2 minutes.",
    },
    {
      image: "https://cdn-icons-png.flaticon.com/512/7210/7210904.png",
      title: "Secure Payment",
      description: "You can make all your flight ticket purchases easily, quickly, and reliably from your home, office, or with your mobile phone.",
    },
    {
      image: "https://static.vecteezy.com/system/resources/previews/003/344/968/non_2x/hotline-icon-with-headphones-and-24-7-sign-client-support-service-vector.jpg",
      title: "24/7 Live Support",
      description: "Our customer service team is ready to support you 24/7 for all transactions you make through obilet Mobile Applications. You can start Live Support with one click and get help.",
    },
  ];

  return (
    <footer className="bg-gray-100 text-black py-12 px-6 mt-5">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg overflow-hidden shadow-lg flex flex-col transition-all hover:scale-105 hover:shadow-2xl hover:bg-gray-100">
            <div className="h-36">
              <img src={card.image} alt={card.title} className="w-full h-full object-contain" />
            </div>
            <div className="p-4 flex-1">
              <h3 className="text-black text-xl font-semibold">{card.title}</h3>
              <p className="text-gray-700 text-sm mt-2">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-gray-500 mt-6">© 2025 FareClubs. All Rights Reserved.</div>
    </footer>
  );
}

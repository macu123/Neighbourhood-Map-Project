var map;
var markers = [];
var infowindow;

VenueModel = function(data) {
  this.name = this.checkData(data.venue.name);
  this.contact = this.checkData(data.venue.contact.formattedPhone);
  this.address = this.checkData(data.venue.location.formattedAddress[0]);
  this.category = this.checkData(data.venue.categories[0].name);
  this.verified = this.checkData(data.venue.verified);
  //this.tips = data.tips[0].text;
  this.rating = this.checkData(data.venue.rating);
  this.icon_prefix = data.venue.categories[0].icon.prefix;
  this.icon_suffix = data.venue.categories[0].icon.suffix;
  this.contentHtml = "<h2>" + this.name + "</h2>" +
  "<p>" + this.contact + "</p>" +
  "<p>" + this.address + "</p>" +
  "<p>Rating: " + this.rating + "</p>";
  this.iconUrl = this.icon_prefix + "bg_44" + this.icon_suffix;
  this.latlng = new google.maps.LatLng(
    data.venue.location.lat,
    data.venue.location.lng
    );
  this.marker = new google.maps.Marker({
    position: this.latlng,
    icon: this.iconUrl,
    animation: google.maps.Animation.DROP,
    contenthtml: this.contentHtml,
    myLatlng: this.latlng,
  });
};

VenueModel.prototype.addMarker = function() {
  this.marker.setMap(map);
};

VenueModel.prototype.removeMarker = function(){
  this.marker.setMap(null);
};

VenueModel.prototype.openInfoWindow = function() {
  infowindow.setContent(this.contentHtml);
  infowindow.open(map, this.marker);
  map.setCenter(this.latlng);
};

VenueModel.prototype.extendBounds = function(bounds) {
  bounds.extend(this.latlng);
};

VenueModel.prototype.checkData = function(raw_data) {
  if(typeof(raw_data) === 'undefined' || raw_data === "") {
    return "N/A";
  }
  else {
    return raw_data;
  }
  
};

function VenuesModel() {
  var self = this;

  self.venuesModel = ko.observableArray();

  //request popular venues from FOURSQAURE
  self.addvenuesModel = function() {
    var four_square_baseUrl = "https://api.foursquare.com/v2/venues/explore?client_id=2XMLIEZFYZSTKFVOSAL5JQFQLQNDNMYGXWGGPWXUSDXQCK4L&client_secret=ZKSE15LDLRYU31YZA2WRL2UYQLDGWFBIPUPTLRH3ITWCEZFL&v=20141230&radius=15000&limit=10&";
    var ll = map.getCenter().toUrlValue();
    var query = $("#pac-input").val();
    var urlToRequest = four_square_baseUrl + "ll=" + ll + "&query=" + query;
    $.getJSON(urlToRequest, function(data){
      var venues = data.response.groups[0].items;
      var bounds = new google.maps.LatLngBounds();
      for(var index in venues){
        var venueModel = new VenueModel(venues[index]);
        venueModel.extendBounds(bounds);
        venueModel.addMarker();
        self.venuesModel.push(venueModel);
        google.maps.event.addListener(venueModel.marker, 'click', function() {
          infowindow.setContent(this.contenthtml);
          infowindow.open(map, this);
          map.setCenter(this.myLatlng);
        });
      }
      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    })
  };

  self.removevenuesModel = function() {
    while(self.venuesModel().length > 0){
      self.venuesModel.pop().removeMarker();
    }
  };

  self.updatevenuesModel = function() {
    if(self.venuesModel().length > 0) {
      self.removevenuesModel();
    }

    self.addvenuesModel();
  };

}

function initialize() {
  var mapOptions = {
  	center: new google.maps.LatLng(43.2633, -79.9189),
  	zoom: 13,
    scaleControl: true,
    mapTypeControl: false
  };
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  infowindow = new google.maps.InfoWindow({content: ""});
  // Create the search box and link it to the UI element.
  var searchbox = /** @type {HTMLInputElement} */(
      document.getElementById('SearchBox'));
  var ListDisplay = document.getElementById('popular_places');

  map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchbox);
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(ListDisplay);
  
}

google.maps.event.addDomListener(window, 'load', initialize);
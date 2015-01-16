var map;
var bounds;
var markers = [];
var infowindow;

VenueModel = function(data) {
  this.name = data.venue.name;
  this.contact = data.venue.contact.formattedPhone;
  this.address = data.venue.location.formattedAddress[0];
  this.category = data.venue.categories[0].name;
  this.verified = data.venue.verified;
  this.icon_prefix = data.venue.categories[0].icon.prefix;
  this.icon_suffix = data.venue.categories[0].icon.suffix;
  this.contentHtml = "<h2>" + this.name + "</h2>" +
  "<p>" + this.contact + "</p>" +
  "<p>" + this.address + "</p>";
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

VenueModel.prototype.updateBounds = function() {
  bounds.extend(this.latlng);
  map.fitBounds(bounds);
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
      for(var index in venues){
        var venueModel = new VenueModel(venues[index]);
        venueModel.updateBounds();
        venueModel.addMarker();
        self.venuesModel.push(venueModel);
        google.maps.event.addListener(venueModel.marker, 'click', function() {
          infowindow.setContent(this.contenthtml);
          infowindow.open(map, this);
          map.setCenter(this.myLatlng);
        });
      }
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
  	disableDefaultUI: true
  }
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  bounds= new google.maps.LatLngBounds();
  infowindow = new google.maps.InfoWindow({content: ""});
  // Create the search box and link it to the UI element.
  var searchbox = /** @type {HTMLInputElement} */(
      document.getElementById('SearchBox'));
  var ListDisplay = document.getElementById('popular-places');

  map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchbox);
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(ListDisplay);
  
}

google.maps.event.addDomListener(window, 'load', initialize);
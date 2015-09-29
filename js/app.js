var map;
var infowindow;
var chart;
var chartOption;
var datatable;
var direction = 0;

//Model for very venue retrieved from foursquare
VenueModel = function(data) {
  this.name = this.checkData(data.venue.name);
  this.contact = this.checkData(data.venue.contact.formattedPhone);
  this.address = this.checkData(data.venue.location.formattedAddress[0]);
  this.category = this.checkData(data.venue.categories[0].name);
  this.verified = this.checkData(data.venue.verified);
  this.rating = this.checkData(data.venue.rating);
  this.icon_prefix = data.venue.categories[0].icon.prefix;
  this.icon_suffix = data.venue.categories[0].icon.suffix;
  //every venue has a marker associated with it
  this.marker = new google.maps.Marker({
    position: new google.maps.LatLng(
    data.venue.location.lat,
    data.venue.location.lng
    ),
    icon: this.icon_prefix + "bg_44" + this.icon_suffix,
    animation: google.maps.Animation.DROP
  });
};

//add start animation and stop animation
VenueModel.prototype.addAnimation = function(marker) {
  marker.setAnimation(google.maps.Animation.BOUNCE);
  setTimeout(function() {
    marker.setAnimation(null);
  }, 3000);
};

//Do a series of events like animation and open infoWindow after clicking
VenueModel.prototype.clickEvent = function(marker) {
  this.addAnimation(marker);
  this.openInfoWindow(marker);
};

//Add a marker to the map
VenueModel.prototype.addMarker = function() {
  this.marker.setMap(map);
};

//Remove a marker from the map
VenueModel.prototype.removeMarker = function() {
  this.marker.setMap(null);
};

//Open infomation window for the venue model
VenueModel.prototype.openInfoWindow = function(marker) {
  map.setCenter(marker.getPosition());
  //set zoom level to 13 when the current zoom level is less than 13
  if(map.getZoom() < 13) {
    map.setZoom(13);
  }
  infowindow.setContent(marker.contentHtml);
  infowindow.open(map, marker);
};

//Extend bounds for the venue model
VenueModel.prototype.extendBounds = function(bounds) {
  bounds.extend(this.marker.getPosition());
};

//Check there is a valid value for each property of the venue model
VenueModel.prototype.checkData = function(raw_data) {
  if(typeof(raw_data) === 'undefined' || raw_data === "") {
    return "N/A";
  }
  else {
    return raw_data;
  }
  
};

//Model for all the venues, which is a array of venue models
function VenuesModel() {
  var self = this;

  //Observable indicating if ajax call fails or not
  self.ajax_failed = ko.observable(false);
  //Observable for number of models unread
  self.num_unread = ko.observable(0);
  //object to store categories and their numbers
  self.categories = {};
  //Observable to store filter keyword
  self.category_filter = ko.observable("None");
  //ObservableArray to store all VenueModel
  self.venuesModel = ko.observableArray();
  //Computed Observable to indicate which part to display
  self.display_state = ko.pureComputed(function() {
    if(self.ajax_failed() === true) {
      return 0;
    }
    else if(self.venuesModel().length < 1) {
      return 1;
    }
    else {
      return 2;
    }
  });
  //Computed Observable to store filtered array
  self.filteredvenuesModel = ko.pureComputed(function() {
    if(self.category_filter() === "None") {
      return self.venuesModel();
    }
    else {
      return ko.utils.arrayFilter(self.venuesModel(), function(vm) {
        return (vm.category === self.category_filter());
      });
    }
  });
  //Stop all other markers animations
  self.stopOtherAnimations = function(self_marker) {
    ko.utils.arrayForEach(self.venuesModel(), function(venueModel) {
      if (venueModel.marker != self_marker) {
        venueModel.marker.setAnimation(null);
      }
    });
  };
  //request popular venue models from FOURSQAURE
  self.addvenuesModel = function() {
    //set limit 20 for number of venue models
    var four_square_baseUrl = "https://api.foursquare.com/v2/venues/explore?" +
    "client_id=2XMLIEZFYZSTKFVOSAL5JQFQLQNDNMYGXWGGPWXUSDXQCK4L&" + 
    "client_secret=ZKSE15LDLRYU31YZA2WRL2UYQLDGWFBIPUPTLRH3ITWCEZFL&" +
    "v=20150920&" + 
    "radius=5000&" + 
    "limit=20&";
    //get current map center when request
    var ll = map.getCenter().toUrlValue();
    //get query from input when request
    var query = $("#pac_input").val();
    var urlToRequest = four_square_baseUrl + "ll=" + ll + "&query=" + query;
    self.category_filter("None");

    //make ajax call
    $.getJSON(urlToRequest, function(data) {
      self.ajax_failed(false);
      var venues = data.response.groups[0].items;
      if(self.checkError(venues) === false) {
        alert(
          "There is no result available now.\nPlease try to search a different term!"
          );
        return;
      }
      var bounds = new google.maps.LatLngBounds();
      for(var i=0, length = venues.length; i < length; i++) {
        self.checkUnique(venues[i]);
        var venueModel = new VenueModel(venues[i]);
        venueModel.extendBounds(bounds);
        venueModel.addMarker();
        //get information window content for every venue model
        ko.applyBindings(venueModel, $("#infoWindow")[0]);
        venueModel.marker.contentHtml = $("#infoWindow").html();
        //remove the binding
        ko.cleanNode($("#infoWindow")[0]);
        self.venuesModel.push(venueModel);
        //add click event listener for every marker
        google.maps.event.addListener(venueModel.marker, 'click', function() {
          venueModel.clickEvent(this);
          self.stopOtherAnimations(this);
        });
      }

      map.fitBounds(bounds);
      map.setCenter(bounds.getCenter());
      self.createPieChart();
      
    //not show the list if the ajax call fails
    }).error(function() {
      self.ajax_failed(true);
      self.updatenum_unread();
      alert(
        "Cannot reach to the  server!\nPlease try it later!"
        );
    });

  };

  //Remove all venue models from the array and remove their markers from the map
  self.removevenuesModel = function() {
    while(self.venuesModel().length > 0) {
      self.venuesModel.pop().removeMarker();
    }
  };

  //Update the array of venue models if search button is clicked
  self.updatevenuesModel = function() {
    if(self.venuesModel().length > 0) {
      self.removevenuesModel();
    }

    self.addvenuesModel();
  };

  //Update the number of venue models unread
  self.updatenum_unread = function() {
    self.num_unread(0);
  };

  //Check if there are errors from the response from foursquare
  self.checkError = function(data) {
    if(data.length < 1) {
      self.num_unread(0);
      return false;
    }
    else {
      self.num_unread(data.length);
      return true;
    }
  };

  self.checkUnique = function(data) {
    var category = data.venue.categories[0].name;
    
    if(self.categories.hasOwnProperty(category) === false) {
      self.categories[category] = 1;
    }
    else {
      self.categories[category] += 1;
    }
  };

  self.createPieChart = function() {
    datatable = new google.visualization.DataTable();
    //Declare columns
    datatable.addColumn('string', 'Category');
    datatable.addColumn('number', 'Total number');
    
    $.each(self.categories, function(propertyName, valueOfProperty) {
      var row = [propertyName, valueOfProperty];
      datatable.addRow(row);
    });

    self.categories = {};

    function selectHandler() {
      var selectedItem = chart.getSelection()[0];
      if(selectedItem) {
        var value = datatable.getValue(selectedItem.row, 0);
        self.category_filter(value);
        self.num_unread(self.filteredvenuesModel().length);
        if(direction === 0) {
          direction = 1;
          $(".collapseOne").css("right", "1%");
        }
      }
    }

    google.visualization.events.addListener(chart, 'select', selectHandler);

    chart.draw(datatable, chartOption);
  };

}

//Initialization
function initialize() {
  chart = new google.visualization.PieChart($("#myPieChart")[0]);
  chartOption = {
    title: 'Category Pie Chart',
    titleTextStyle: {
      fontSize: 15,
      bold: true
    },
    chartArea: {
      width: '100%'
    },
    legend: {
      position: 'bottom'
    }
  };
  var mapOptions = {
  	zoom: 13,
    disableDefaultUI: true,
    scaleControl: true
  };

  map = new google.maps.Map($("#map-canvas")[0], mapOptions);
  infowindow = new google.maps.InfoWindow({content: ""});

  //Bootstrap popover
  $(".setting").popover({
    title: "Location Setting",
    content: "<input class='loc_input' type='text' placeholder='Location like Toronto'>",
    html: true,
    placement: "bottom"
  });

  //Bootstrap popover event handler
  $(".setting").on('shown.bs.popover', function() {
    var loc_input = $(".loc_input")[0];
    //Google map autocomplete
    var autocompleteOption = {
      types: ['geocode']
    };
    var autocomplete = new google.maps.places.Autocomplete(
      loc_input,
      autocompleteOption
    );
    //Google map autocomplete event handler
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
      var place = autocomplete.getPlace();
      //No geometry
      if(!place.geometry) {
        alert("Cannot locate this place!\nPlease try it later!");
        return;
      }
      //Have geometry
      //If have viewport
      if(place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
      //If have no viewport
      }
      else {
        map.setCenter(place.geometry.location);
        map.setZoom(13);
      }
      
    });
  });

  //listButton collapse
  $(".listButton").click(function() {
    var r = $(".collapseOne").css("right");
    if(direction === 0) {
      direction = 1;
      $(".collapseOne").css("right", "1%");
    }
    else {
      direction = 0;
      $(".collapseOne").css("right", "-30%");
    }
  });

  var venuesModel = new VenuesModel();
  ko.applyBindings(venuesModel, $(".full-screen")[0]);
  // Try W3C Geolocation (Preferred)
  //Autodetect user location
  navigator.geolocation.getCurrentPosition(
    function(position) {
      var initialLocation = new google.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
      );

      map.setCenter(initialLocation);
      venuesModel.updatevenuesModel();
    },
    function() {
      // Browser doesn't support Geolocation
      map.setCenter(new google.maps.LatLng(43.2633, -79.9189));
      venuesModel.updatevenuesModel();
    },
    {timeout:10000}
  );
  
}

//Do initializa function each time when window is load
if(typeof google === 'object' && typeof google.maps === 'object') {
  google.maps.event.addDomListener(window, 'load', initialize);
}
else {
  alert(
    "The google map cannot be fully loaded!\nPlease try it later!"
    );
}
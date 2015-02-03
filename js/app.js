var map;
var infowindow;
var chart;
var chartOption;
var datatable;

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

//Add a marker to the map
VenueModel.prototype.addMarker = function() {
  this.marker.setMap(map);
};

//Remove a marker from the map
VenueModel.prototype.removeMarker = function() {
  this.marker.setMap(null);
};

//Open infomation window for the venue model
VenueModel.prototype.openInfoWindow = function() {
  infowindow.setContent(this.marker.contentHtml);
  infowindow.open(map, this.marker);
  map.setCenter(this.marker.getPosition());
  if(map.getZoom() < 13) {
    map.setZoom(13);
  }
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

  //Observable for number of models unread
  self.num_unread = ko.observable(0);
  //Observable to store boolean variable for if the list of models is shown or not
  self.if_shown = ko.observable(false);
  //object to store categories and their numbers
  self.categories = {};
  //Observable to store filter keyword
  self.category_filter = ko.observable("None");
  //ObservableArray to store all VenueModel
  self.venuesModel = ko.observableArray();
  //Computed Observable to store filtered array
  self.filtedvenuesModel = ko.computed(function() {
    if(self.category_filter() === "None") {
      return self.venuesModel();
    }
    else {
      return ko.utils.arrayFilter(self.venuesModel(), function(vm) {
        return (vm.category === self.category_filter());
      });
    }
  });

  //request popular venue models from FOURSQAURE
  self.addvenuesModel = function() {
    //set limit 10 for number of venue models
    var four_square_baseUrl = "https://api.foursquare.com/v2/venues/explore?" +
    "client_id=2XMLIEZFYZSTKFVOSAL5JQFQLQNDNMYGXWGGPWXUSDXQCK4L&" + 
    "client_secret=ZKSE15LDLRYU31YZA2WRL2UYQLDGWFBIPUPTLRH3ITWCEZFL&" +
    "v=20150130&" + 
    "radius=20000&" + 
    "limit=30&";
    //get current map center when request
    var ll = map.getCenter().toUrlValue();
    //get query from input when request
    var query = $("#pac_input").val();
    var urlToRequest = four_square_baseUrl + "ll=" + ll + "&query=" + query;
    
    self.category_filter("None");

    //make ajax call
    $.getJSON(urlToRequest, function(data) {
      var venues = data.response.groups[0].items;
      if(self.checkError(venues) === false)
        return;
      var bounds = new google.maps.LatLngBounds();
      for(var index in venues) {
        self.checkUnique(venues[index]);
        var venueModel = new VenueModel(venues[index]);
        venueModel.extendBounds(bounds);
        venueModel.addMarker();
        //get information window content for every venue model
        ko.applyBindings(venueModel, $("#infoWindow")[0]);
        venueModel.marker.contentHtml = $("#infoWindow").html()
        //remove the binding
        ko.cleanNode($("#infoWindow")[0]);
        self.venuesModel.push(venueModel);
        //add click event listener for every marker
        google.maps.event.addListener(venueModel.marker, 'click', function() {
          infowindow.setContent(this.contentHtml);
          infowindow.open(map, this);
          map.setCenter(this.getPosition());
          //set zoom level to 13 when the current zoom level is less than 13
          if(map.getZoom() < 13) {
            map.setZoom(13);
          }
        });
      }

      map.fitBounds(bounds);
      map.setCenter(bounds.getCenter());
      self.createPieChart();
      
    //not show the list if the ajax call fails
    }).error(function() {
      self.if_shown(false); 
    })
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
      self.if_shown(false);
      return false;
    }
    else {
      self.num_unread(data.length);
      self.if_shown(true);
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
        self.num_unread(self.filtedvenuesModel().length);
        $("#collapseOne").collapse('show');
      }
    }

    google.visualization.events.addListener(chart, 'select', selectHandler);

    chart.draw(datatable, chartOption);
  };

}

//Initialize the map
function initialize() {
  chart = new google.visualization.PieChart($("#myPieChart")[0]);
  chartOption = {
    title: 'Category Pie Chart',
    is3D: true,
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

  // Try W3C Geolocation (Preferred)
  //Autodetect user location
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var initialLocation = new google.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
        );
      map.setCenter(initialLocation);
    }, function() {
      map.setCenter(new google.maps.LatLng(43.2633, -79.9189));
    });
  }
  // Browser doesn't support Geolocation
  else {
    map.setCenter(new google.maps.LatLng(43.2633, -79.9189));
  }

  infowindow = new google.maps.InfoWindow({content: ""});
  ko.applyBindings(new VenuesModel(), $("#full-screen")[0]);
  //Bootstrap popover
  $("#setting").popover({
    title: "Location Setting",
    content: "<input id='loc_input' type='text' placeholder='Location like Toronto'>",
    html: true,
    placement: "bottom"
  });
  //Bootstrap popover event handler
  $("#setting").on('shown.bs.popover', function() {
    var loc_input = $("#loc_input")[0];
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

  //redraw charts when resizing
  $(window).resize(function() {
    if(datatable != undefined) {
      chart.draw(datatable, chartOption);
    }
  });

}

//Do initializa function each time when window is load
google.maps.event.addDomListener(window, 'load', initialize);

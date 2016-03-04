angular
  .module('datalayerModule', [])
  .factory('datalayer', datalayer);

function datalayer($rootScope, $http, $q) {
  // pub sub implementation
  var topics = {},
      subUid = -1;

  function ResourceFactory(configuration) {

    var config = {
      url: './',
      model: '',
      version: 'v1',
      id_reference: 'id'
    };

    angular.extend(config, configuration || {});

    function Resource(data) {
      angular.extend(this || {}, data);
    }

    Resource.prototype = {
      $save: function() {
        var defer = $q.defer();
        var self = this;
        if (!this[config.id_reference]) {

          $http.post(config.url + config.version + '/' + config.model, this)
            .then(function(result) {
              self.id = result.data;

              Resource.$trigger('dl-save', self);
              Resource.$trigger('dl-' + config.model + '.save', self);

              defer.resolve('Saved sucessfully!');
            }, function(error) {
              Resource.$trigger('dl-save', error);
              Resource.$trigger('dl-' + config.model + '.save', error);

              defer.reject(error);
            });

        }
        else {

          $http.put(config.url + config.version + '/' + config.model + '/' + this.id, this)
            .then(function(data) {
              Resource.$trigger('dl-save', self);
              Resource.$trigger('dl-' + config.model + '.save', self);

              defer.resolve('updated sucessfully');
            }, function(error) {
              Resource.$trigger('dl-save', error);
              Resource.$trigger('dl-' + config.model + '.save', error);

              defer.reject(error);
            });
        }

        return defer.promise;
      }
    };

    Resource.find = function(filter) {
      var defer = $q.defer();
      var data = {
        objects: [],
        totalCount: 0
      };

      $http.get(config.url + config.version + '/' + config.model + '/find', {
          params: {
            query: JSON.stringify(filter)
          }
        })
        .then(function(result) {
          data.totalCount = result.data.totalCount;

          angular.forEach(result.data.objects, function(object) {
            data.objects.push(new Resource(object));
          });

          defer.resolve(data);
        }, function(error) {
          defer.reject(error);
        });

      return defer.promise;
    };

    Resource.get = function(params) {
      var defer = $q.defer();

      if (!params.id) {
        defer.reject('Expecting id for the operation');
      }

      $http.get(config.url + config.version + '/' + config.model + '/' + params.id)
        .then(function(result) {

          defer.resolve(new Resource(result.data));

        }, function(error) {
          defer.reject(error);
        });

      return defer.promise;
    };

    Resource.delete = function(params) {
      var defer = $q.defer();

      if (!params.id) {
        defer.reject('Expecting id for the operation');
      }

      $http.delete(config.url + config.version + '/' + config.model + '/', params.id)
        .then(function(data) {
          self.publish('dl-save', self);
          self.publish('dl-' + config.model + '.delete', self);

          defer.resolve(data);
        }, function(error) {
          self.publish('dl-save', self);
          self.publish('dl-' + config.model + '.delete', self);
          defer.reject(error);
        });

      return defer.promise;
    };

    Resource.$on = function(topic, func) {
      if (!topics[topic]) {
        topics[topic] = [];
      }

      var token = (++subUid).toString();

      topics[topic].push({
        token: token,
        func: func
      });
      return token;
    };

    Resource.$trigger = function(topic, args) {
      if (!topics[topic]) {
        return false;
      }
      setTimeout(function() {
        var subscribers = topics[topic],
          len = subscribers ? subscribers.length : 0;

        while (len--) {
          // subscribers[len].func(topic, args);
          subscribers[len].func(args);
        }
      }, 0);
      return true;
    };

    Resource.$off = function(token) {
      for (var m in topics) {
        if (topics[m]) {
          for (var i = 0, j = topics[m].length; i < j; i++) {
            if (topics[m][i].token === token) {
              topics[m].splice(i, 1);
              return token;
            }
          }
        }
      }
      return false;
    };

    return Resource;

  }

  return ResourceFactory;
}

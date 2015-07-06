$(document).ready(function () {
  var store = new Story('NoxRip'),
      lastChecked = store.get('lastChecked');

  $.ajax({
    url: 'https://cryptic-wave-3815.herokuapp.com',
    dataType: 'json',
    success: function (transport) {
      transport.activities.forEach(function (el) {
        var ts = moment(el.timestamp);
        el.timeAgo = ts.fromNow();
        el.timeFull = ts.format('MMMM Do YYYY, h:mm a');
        el.icon = el.source;

        var isNew = lastChecked && moment(lastChecked) < ts;

        var activity = $('template#activity').html();
        for (var i in el) if (el.hasOwnProperty(i) && typeof el[i] === 'string') {
          activity = activity.replace(new RegExp('{{' + i + '}}', 'g'), el[i]);
        }
        $(activity).toggleClass('new', !!isNew).appendTo('#activities');
      });

      $('#stream-info').removeClass('online offline hosting').addClass(transport.stream.status);

      if (transport.stream.status !== 'offline') {
        var streamInfo = $('template#stream').html();
        var activity = $('template#activity').html();

        var ts = moment(transport.stream.data.created_at);

        var kvMap = {
          thumbnail: transport.stream.data.preview.large,
          title: transport.stream.status === 'online' ? 'LIVE' : 'Hosting: ' + transport.stream.data.channel.display_name,
          icon: 'circle',
          source: 'live ' + transport.stream.status,
          description: transport.stream.data.channel.status,
          game: transport.stream.data.game,
          timestamp: transport.stream.data.created_at,
          timeAgo: ts.fromNow(),
          timeFull: ts.format('MMMM Do YYYY, h:mm a'),
          url: transport.stream.data.channel.url
        };

        for (var i in kvMap) if (kvMap.hasOwnProperty(i)) {
          streamInfo = streamInfo.replace(new RegExp('{{' + i + '}}', 'g'), kvMap[i]);
          activity = activity.replace(new RegExp('{{' + i + '}}', 'g'), kvMap[i]);
        }

        $(streamInfo).appendTo('#stream-info');
        $(activity).addClass('stream-online').prependTo('#activities');
      }

      var generated = moment(transport.generated);
      $('#footer').text('Data generated ' + generated.format('MMMM D h:mm:ss a'));

      $('#loading').hide();

      store.set('lastChecked', new Date());
    },
    error: function (jqXHR, textStatus, err) {
      var error = $('template#error').html();
      error = error.replace(/{{errorMessage}}/g, err || 'Unknown error');
      $(error).appendTo('#activities');
      $('#loading').hide();
    }
  });

  $(window).on('scroll resize', function () {
    var isFixed = $(this).scrollTop() > $('header').outerHeight()
                  && $('#extra').height() < window.innerHeight
                  && $('#extra').height() < $('#content').height();
    $('#extra').toggleClass('fixed', isFixed);
  });

  var isBouncing = false;
  var toggleBounce = function () {
    isBouncing = !isBouncing;

    NutBounce[isBouncing ? 'start' : 'stop']();
  };

  $('#nox-face').on('click', function () {
    if (!NutBounce.source) {
      $('#loading').show();
      NutBounce.load('coffinloop.mp3', function (pulseRate) {
        $('.animated-overlay, .animated-overlay .title, #nox-face').css({
          animationDuration: pulseRate + 'ms'
        });

        $('#boom, #card .card-wrapper').css('animationDuration', (pulseRate * 8) + 'ms, ' + (pulseRate * 16) + 'ms');

        $('#loading').hide();

        toggleBounce();
      });
    } else {
      toggleBounce();
    }
  });
});

var NutBounce = (function ($, window) {

  var _this = this;

  var audioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext,
      audioDataDecoded,
      ctx,
      pulseRate,
      isMp3 = false;


  if (audioContext) {
    ctx = new audioContext();
  }

  this.config = {
    groups: 4,
    bumps: 20,
    container: '.almond-carton'
  };

  this.source = null;

  this.load = function (url, callback) {
    if (!ctx) {
      pulseRate = 500;
      if (callback && typeof callback === 'function') {
        callback(pulseRate);
      }
      return;
    }

    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'arraybuffer';
    req.onload = function () {
      ctx.decodeAudioData(req.response, function (data) {
        audioDataDecoded = data;

        isMp3 = !!url.match(/\.mp3$/);

        if (isMp3) {
          pulseRate = (((data.length - 1152 - 1057) / data.sampleRate) * 1000) / 32;
        } else {
          pulseRate = (data.duration / 32) * 1000;
        }

        if (callback && typeof callback === 'function') {
          callback(pulseRate);
        }
      });
    };
    req.send();
  };

  this.start = function () {
    if (audioDataDecoded) {
      _this.source = ctx.createBufferSource();
      _this.source.buffer = audioDataDecoded;
      _this.source.loop = true;
      if (isMp3) {
        // what the fuck
        _this.source.loopStart = 1057 / audioDataDecoded.sampleRate;
        _this.source.loopEnd = (audioDataDecoded.length - 1152) / audioDataDecoded.sampleRate;
      } else {
        _this.source.loopStart = 0;
        _this.source.loopEnd = 0;
      }
      _this.source.connect(ctx.destination);

      var gain = ctx.createGain();
      gain.gain.value = -0.5;
      _this.source.connect(gain);
      gain.connect(ctx.destination);

      _this.source.start(0);
    }

    var $container = $(config.container);

    $container.find('.bump').remove();

    for (var i = 0; i < config.bumps; i++) {
      var $bump = $('<div />').addClass('bump');
      var bumpGroup = Math.floor(i / (config.bumps / config.groups));
      var bumpDelay = (pulseRate * 0.06) + (-pulseRate * bumpGroup);
      $bump.data('bump-group', bumpGroup);
      $bump.css({
        'animation-duration': (pulseRate * config.groups) + 'ms',
        '-webkit-animation-duration': (pulseRate * config.groups) + 'ms',
        'animation-delay': bumpDelay + 'ms',
        '-webkit-animation-delay': bumpDelay + 'ms',

        height: (25 + Math.random() * 75) + '%',
        left: 'calc(' + ((Math.random() * 120) - 10) + '% - 150px)',
        transform: 'rotateY(' + (180 * Math.round(Math.random())) + 'deg)'
                 + 'rotateZ(' + (Math.random() * 10 - 5) + 'deg)'
                 //+ 'scale(' + (Math.round(Math.random() * 0.25) + 0.75) + ')'
      });

      $bump.appendTo($container);
    }

    $container.addClass('animate');
  };

  this.stop = function () {
    if (_this.source) {
      _this.source.stop(0);
    }

    $(config.container).removeClass('animate');
  };

  return this;
}(jQuery, window));

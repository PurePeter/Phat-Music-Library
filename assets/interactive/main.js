import data from "../database/songs.js";
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const PLAYER_STORAGE_KEY = "PLAYER_STORAGE";

const player = $(".player");
const cd = $(".cd");
const heading = $("header h2");
const cdThumb = $(".cd-thumb");
const audio = $("#audio");
const playBtn = $(".btn-toggle-play");
const progress = $("#progress");
const nextBtn = $(".btn-next");
const prevBtn = $(".btn-prev");
const randomBtn = $(".btn-random");
const repeatBtn = $(".btn-repeat");
const playlist = $(".playlist");
const optionBtn = $(".option");
const optionList = $(".option-list");
const themeText = $(".theme-btn span");
const themeIcon = $(".theme-icon");

//Volume
const volumeBtn = $(".btn-volume");
const volumeWrap = $(".volume-wrap");
const volumeRange = $(".volume-range");
const volumeOutput = $(".volume-output");

// Favorite box
const favoritModal = $(".favorite-songs-modal");
const favoriteList = $(".favorite-songs-list");
const emptyList = $(".empty-list");

// Search
const searchBox = $(".search-box");
const searchInput = $(".search-bar");
const searchSongs = $(".search-songs");

// Xử lý logic cd thumb xoay và dừng
const cdThumbAnimate = cdThumb.animate(
  [
    {
      transform: "rotate(360deg)",
    },
  ],
  {
    duration: 20000,
    iterations: Infinity,
  }
);
cdThumbAnimate.pause();

// Mảng chứa index bài hát được thả tim
let likedList = [];
// Mảng chứa index bài hát đã chạy random
let randomFilter = [];
// Biến lưu query tất cả bài hát ở playlist để thực hiện searching
let songsList;
const app = {
  currentIndex: 0,
  isPlaying: false,
  isRandom: false,
  isRepeat: false,
  config: JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)) || {},
  setConfig: function (key, value) {
    this.config[key] = value;
    clearTimeout(this.saveConfigTimeout);
    this.saveConfigTimeout = setTimeout(() => {
      localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(this.config));
    }, 300); // Lưu sau 300ms để tránh ghi liên tục
  },
  songs: data.songs,
  render: function (songsArray, renderElem) {
    const htmls = songsArray.map((song, index) => {
      return `
                <div class= "song-node">
                    <div class="song" data-index="${index}">
                        <div class="thumb" style="background-image: url('${song.image}')"></div>
                        <div class="body">
                            <h3 class="title">${song.name}</h3>
                            <p class="author">${song.singer}</p>
                        </div>
                        <div class="favorite">
                            <i class="far fa-heart"></i>
                        </div>
                    </div>
                </div>`;
    });
    renderElem.innerHTML = htmls.join("");
  },
  defineProperties: function () {
    Object.defineProperty(this, "currentSong", {
      get: function () {
        return this.songs[this.currentIndex];
      },
    });
  },
  // Chuẩn hóa chuỗi unicode format
  removeAccents: function (str) {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  },
  handleEvents: function () {
    const _this = this;
    const cdWidth = cd.offsetWidth;

    // Nhấn space để phát / dừng bài hát
    document.onkeydown = function (e) {
      e = e || window.event;
      // use e.keyCode
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        if (_this.isPlaying) {
          audio.pause();
        } else {
          audio.play();
        }
      }
    };

    // Click outside then close the opening box
    document.onclick = function (e) {
      if (!e.target.closest(".option")) {
        optionList.style.display = null;
      }
      if (!e.target.closest(".btn-volume")) {
        volumeWrap.style.display = null;
      }
      if (!e.target.closest(".search-box")) {
        searchSongs.style.display = null;
        searchInput.style.borderBottomRightRadius = "";
        searchInput.style.borderBottomLeftRadius = "";
      }
    };

    // Xử lý scale cd
    document.onscroll = function () {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const newCdWidth = cdWidth - scrollTop;
      cd.style.width = newCdWidth > 0 ? newCdWidth + "px" : 0;
      cd.style.opacity = newCdWidth / cdWidth;
    };

    // region Searching
    searchBox.onclick = function () {
      searchSongs.style.display = "block";
      searchInput.setAttribute(
        "style",
        "border-bottom-right-radius: 0; border-bottom-left-radius: 0"
      );

      // Biến lưu query tất cả bài hát để thực hiện search
      songsList = $$(".song-node");
    };
    searchInput.oninput = function () {
      let searchValue = searchInput.value.trim(); // Loại bỏ khoảng trắng đầu cuối
      searchSongs.innerHTML = ""; // Xóa nội dung cũ

      if (!searchValue) {
        return; // Nếu ô tìm kiếm trống thì không hiển thị gì
      }

      let searchResult = [];
      songsList.forEach((song) => {
        let copySong = song.cloneNode(true);
        let songInfo = _this.removeAccents(copySong.innerText).toUpperCase();
        searchValue = _this.removeAccents(searchValue).toUpperCase();
        if (songInfo.includes(searchValue)) {
          searchResult.push(copySong.innerHTML);
        }
      });

      // Nếu có kết quả, hiển thị danh sách bài hát
      if (searchResult.length > 0) {
        searchSongs.innerHTML = searchResult.join("");
      } else {
        searchSongs.innerHTML = "Không có kết quả nào được tìm thấy ＞﹏＜";
      }
    };

    searchSongs.onclick = (e) => {
      playlist.onclick(e);
    };
    // End for logic Searching

    // #region Volume
    // Bật tắt volume
    volumeBtn.onclick = function () {
      volumeWrap.style.display = !Boolean(volumeWrap.style.display)
        ? "block"
        : null;
    };
    volumeWrap.onclick = function (e) {
      e.stopPropagation();
    };

    // Drag volume range
    volumeRange.oninput = function (e) {
      audio.volume = e.target.value / 100;
      volumeOutput.textContent = e.target.value;
      _this.setConfig("volume", e.target.value);
    };
    // #endregion Volume

    // #region Options
    // Show option list
    optionBtn.onclick = function (e) {
      optionList.style.display = !Boolean(optionList.style.display)
        ? "block"
        : null;
    };

    optionList.onclick = function (e) {
      const themeBtn = e.target.closest(".theme-btn");
      if (themeBtn) {
        // Toggle dark mode
        $("body").classList.toggle("dark");

        // Cập nhật icon & text dựa trên trạng thái mới
        if ($("body").classList.contains("dark")) {
          themeIcon.classList.remove("fa-moon");
          themeIcon.classList.add("fa-sun");
          themeText.textContent = "Light mode"; // Vì đang ở Dark mode nên hiển thị Light mode để chuyển lại
        } else {
          themeIcon.classList.remove("fa-sun");
          themeIcon.classList.add("fa-moon");
          themeText.textContent = "Dark mode"; // Vì đang ở Light mode nên hiển thị Dark mode để chuyển lại
        }

        // Lưu cấu hình vào localStorage
        _this.setConfig("classDark", $("body").className);

        e.stopPropagation();
        return;
      }

      // Xử lý mở danh sách bài hát yêu thích
      favoritModal.style.display = "flex";
      $("body").style.overflow = "hidden";
      emptyList.style.display =
        favoriteList.childElementCount > 0 ? "none" : null;
    };

    //#endregion Options

    // #region Favorite songs
    // Xử lý bấm vào nút close và ra ngoài thì đóng favorite box
    favoritModal.onclick = function (e) {
      if (
        e.target.matches(".favorite-songs-close") ||
        e.target.matches(".favorite-songs-modal")
      ) {
        favoritModal.style.display = null;
        $("body").style.overflow = null;
      } else {
        playlist.onclick(e);
      }
      emptyList.style.display =
        favoriteList.childElementCount > 0 ? "none" : null;
    };
    //#endregion Favorite Songs

    // #region Play button
    // Xử lý khi người dùng click vào play button
    playBtn.onclick = function () {
      if (_this.isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    };
    audio.onplay = function () {
      _this.isPlaying = true;
      player.classList.add("playing");
      cdThumbAnimate.play();
    };
    audio.onpause = function () {
      _this.isPlaying = false;
      player.classList.remove("playing");
      cdThumbAnimate.pause();
    };
    audio.onended = function () {
      if (_this.isRepeat) {
        audio.play();
      } else {
        nextBtn.click();
      }
    };
    //#endregion Favorite Songs

    // #region Play button
    // Xử lý khi người dùng click vào play button
    audio.ontimeupdate = function () {
      if (audio.duration) {
        // Percent of progress
        const progressPercent = (audio.currentTime / audio.duration) * 100;
        progress.value = progressPercent;
        _this.setConfig("songCurrentTime", audio.currentTime);
        _this.setConfig("songProgressValue", progress.value);
      }
    };
    // Xử lý khi tua bài hát
    progress.oninput = function (e) {
      const seekTime = (audio.duration * e.target.value) / 100;
      audio.currentTime = seekTime;
    };
    // #endregion Progress bar

    // #region Controllers: Next, Prev, Random, Repeat buttons
    nextBtn.onclick = function () {
      if (_this.isRandom) {
        _this.playRandomSong();
      } else {
        _this.nextSong();
      }
    };

    prevBtn.onclick = function () {
      if (_this.isRandom) {
        _this.playRandomSong();
      } else {
        _this.prevSong();
      }
    };

    // Bật tắt nút random
    function handleButtonClick(button, stateKey, otherButton, otherStateKey) {
      return function (event) {
        event.preventDefault(); // Ngăn chặn hành vi không mong muốn trên mobile

        _this[stateKey] = !_this[stateKey];
        _this.setConfig(stateKey, _this[stateKey]);

        // Cập nhật trạng thái hiển thị
        button.classList.toggle("active", _this[stateKey]);

        // Nếu bật random thì tắt repeat và ngược lại
        if (_this[stateKey]) {
          _this[otherStateKey] = false;
          _this.setConfig(otherStateKey, _this[otherStateKey]);
          otherButton.classList.remove("active");
        }
      };
    }

    // Đảm bảo hỗ trợ cả mobile & desktop
    const eventType = "ontouchstart" in window ? "touchstart" : "click";

    randomBtn.addEventListener(
      eventType,
      handleButtonClick(randomBtn, "isRandom", repeatBtn, "isRepeat")
    );
    repeatBtn.addEventListener(
      eventType,
      handleButtonClick(repeatBtn, "isRepeat", randomBtn, "isRandom")
    );

    // #endregion Controllers

    // #region Playlist : click on songs
    // CLick vào playlist
    playlist.onclick = function (e) {
      const songNode = e.target.closest(".song:not(.active)");
      const favoriteIcon = e.target.closest(".favorite i");
      if (!favoriteIcon) {
        // Xử lý khi click để chuyển bài hát
        _this.currentIndex = Number(songNode.dataset.index);
        _this.loadCurrentSong();
        audio.play();
      } else {
        // Xử lý khi thả tim hoặc bỏ tim
        // Từ icon đã nhấn tim, trỏ tới Parent song của icon đó
        let favoriteSong = favoriteIcon.closest(".song");
        _this.handleLikedList([favoriteSong.dataset.index]);
        _this.setConfig("likedListIndex", likedList);
      }
    };
    // #endregion Playlist
  },

  // Xử lý danh sách bài hát yêu thích
  handleLikedList: function (favSongIndex) {
    // Duyệt mảng vị trí các bài hát đã bấm tim, nếu like thì thêm vào favorite box
    // bỏ like thì xóa khỏi favorite box, áp dụng cho cả loadconfig
    favSongIndex.forEach(function (index) {
      let favoriteSong = $$(`.song[data-index="${index}"]`);
      if (!favoriteSong.length) return;
      favoriteSong.forEach((song) => {
        song.classList.toggle("liked");
        song.querySelector("i").classList.toggle("fas");
      });
      favoriteSong = favoriteSong[0];
      if (favoriteSong.matches(".liked")) {
        favoriteList.appendChild(favoriteSong.cloneNode(true));
        likedList.push(index);
      } else {
        let removeSong = $(`.favorite-songs .song[data-index="${index}"]`);
        removeSong.remove();
        likedList.splice(likedList.indexOf(index), 1);
      }
    });
  },

  // Focus, cuộn tới bài hát đang phát
  scrollToActiveSong: function () {
    requestAnimationFrame(() => {
      const activeSong = $(".playlist .song.active");
      if (activeSong) {
        activeSong.scrollIntoView({
          behavior: "smooth",
          block: "end",
          inline: "nearest",
        });
      }
    });
  },

  //#region Controllers: Next, Prev, Random
  nextSong: function () {
    this.currentIndex++;
    if (this.currentIndex >= this.songs.length) {
      this.currentIndex = 0;
    }
    this.loadCurrentSong();
    audio.play();
  },

  prevSong: function () {
    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = this.songs.length - 1;
    }
    this.loadCurrentSong();
    audio.play();
  },

  playRandomSong: function () {
    if (this.songs.length < 2) return;
    let newIndex = this.currentIndex;

    if (randomFilter.length == 0) {
      randomFilter.push(this.currentIndex);
    } else if (randomFilter.length == this.songs.length) {
      randomFilter.length = 0;
      randomFilter.push(this.currentIndex);
    }

    do {
      newIndex = Math.floor(Math.random() * this.songs.length);
    } while (randomFilter.includes(newIndex));

    this.currentIndex = newIndex;
    this.loadCurrentSong();
    audio.play();

    randomFilter.push(this.currentIndex);
  },
  //#endregion Controllers

  // Load bài hát hiện tại
  loadCurrentSong: function () {
    // Load song Info
    heading.textContent = this.currentSong.name;
    cdThumb.style.backgroundImage = `url('${this.currentSong.image}')`;
    audio.src = this.currentSong.path;

    // Add active class to Current Song on playlist and Favorite
    const activeSongs = $$(".song.active");
    const currentActiveSongs = $$(`.song[data-index= "${this.currentIndex}"]`);
    currentActiveSongs.forEach((activeSong) => {
      activeSong.classList.add("active");
    });
    activeSongs.forEach((activeSong) => {
      if (activeSong && activeSong.matches(".active")) {
        activeSong.classList.remove("active");
      }
    });

    // Lưu bài hát hiện tại vào localStorage
    this.setConfig("currentSongIndex", this.currentIndex);
    // scroll to current song
    this.scrollToActiveSong();
  },

  // Load cấu hình đã lưu mỗi khi reload trang
  loadConfig: function () {
    this.isRandom = this.config.isRandom || false;
    this.isRepeat = this.config.isRepeat || false;
    randomBtn.classList.toggle("active", this.isRandom);
    repeatBtn.classList.toggle("active", this.isRepeat);
    this.currentIndex = this.config.currentSongIndex || 0;
    progress.value = this.config.songProgressValue || 0;
    audio.currentTime = this.config.songCurrentTime || 0;

    // Load Theme
    if (this.config.classDark) {
      themeIcon.classList.toggle("fa-sun");
      $("body").classList.toggle("dark");
      themeText.textContent = themeIcon.matches(".fa-sun")
        ? "Light mode"
        : "Dark mode";
    }

    // Load volume
    audio.volume =
      typeof this.config.volume === "number" ? this.config.volume / 100 : 1;
    volumeRange.value =
      typeof this.config.volume === "number" ? this.config.volume : 100;
    volumeOutput.textContent =
      typeof this.config.volume === "number" ? this.config.volume : "100";

    // Load likedList
    if ("likedListIndex" in this.config && this.config.likedListIndex.length) {
      this.handleLikedList(this.config.likedListIndex);
    }
  },

  start: function () {
    this.defineProperties();

    // Xử lý các sự kiện (DOM Events)
    this.handleEvents();

    // Render bài hát vào playlist
    this.render(this.songs, playlist);

    // Gán cấu hình đã lưu từ config vào Object
    this.loadConfig();

    // Tải thông tin bài hát đầu tiên vào UI khi chạy
    this.loadCurrentSong();
  },
};

app.start();

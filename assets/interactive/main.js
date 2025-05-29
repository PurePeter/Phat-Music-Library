import data from "../database/songs.js";

//#region Khai bao
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

// Upload Song box
const uploadSong = $(".upload-song");
const uploadAudioInput = $("#upload-audio-input");
const uploadImageInput = $("#upload-image-input");
const uploadModal = $("#upload-modal");
const songNameInput = $("#song-name-title");
const singerNameInput = $("#singer-name-title");
const uploadImageBtn = $("#upload-image-btn");
const previewImage = $("#preview-image");
const saveSongBtn = $("#save-song-btn");
const cancelSongBtn = $("#cancel-song-btn");

// Search
const searchBox = $(".search-box");
const searchInput = $(".search-bar");
const searchSongs = $(".search-songs");

// #endregion Khai bao

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
let likedList =
  JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY))?.likedListIndex || [];

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
  songs:
    JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY))?.songs !== undefined
      ? JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)).songs
      : data.songs,
  render: function (songsArray, renderElem) {
    if (!songsArray || songsArray.length === 0) {
      renderElem.innerHTML = "<p>Empty Song List (┬┬﹏┬┬)</p>";
      return;
    }
    const htmls = songsArray.map((song, index) => {
      const isLiked = likedList.includes(index);
      return `
        <div class="song-node">
          <div class="song${isLiked ? " liked" : ""}" data-index="${index}">
            <div class="thumb" style="background-image: url('${
              song.image
            }')"></div>
            <div class="body">
              <h3 class="title">${song.name}</h3>
              <p class="author">${song.singer}</p>
            </div>
            <div class="favorite">
              <i class="${isLiked ? "fas" : "far"} fa-heart"></i>
            </div>
            <div class="btn-delete">
              <i class="fa-solid fa-trash"></i>
            </div>
          </div>
        </div>`;
    });
    renderElem.innerHTML = htmls.join("");
    this.updateFavoriteList();
  },

  // Cập nhật lại danh sách favoriteList dựa trên likedList
  updateFavoriteList: function () {
    favoriteList.innerHTML = "";
    if (!likedList.length) {
      emptyList.style.display = "";
      return;
    }
    likedList.forEach((index) => {
      const song = this.songs[index];
      if (song) {
        const songHtml = `
          <div class="song liked" data-index="${index}">
            <div class="thumb" style="background-image: url('${song.image}')"></div>
            <div class="body">
              <h3 class="title">${song.name}</h3>
              <p class="author">${song.singer}</p>
            </div>
            <div class="favorite">
              <i class="fas fa-heart"></i>
            </div>
            <div class="btn-delete">
              <i class="fa-solid fa-trash"></i>
            </div>
          </div>
        `;
        const div = document.createElement("div");
        div.className = "song-node";
        div.innerHTML = songHtml;
        favoriteList.appendChild(div);
      }
    });
    emptyList.style.display = favoriteList.childElementCount > 0 ? "none" : "";
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
      // use e.keyCode
      e = e || window.event;
      if (
        e.code === "Space" &&
        !["INPUT", "TEXTAREA"].includes(e.target.tagName)
      ) {
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
      let searchValue = searchInput.value.trim();
      searchSongs.innerHTML = "";
      if (!searchValue) return;

      let searchResult = app.songs
        .map((song, index) => {
          let songInfo = app
            .removeAccents(song.name + " " + song.singer)
            .toUpperCase();
          let value = app.removeAccents(searchValue).toUpperCase();
          if (songInfo.includes(value)) {
            return `
          <div class="song-node">
            <div class="song${
              likedList.includes(index) ? " liked" : ""
            }" data-index="${index}">
              <div class="thumb" style="background-image: url('${
                song.image
              }')"></div>
              <div class="body">
                <h3 class="title">${song.name}</h3>
                <p class="author">${song.singer}</p>
              </div>
              <div class="favorite">
                <i class="${
                  likedList.includes(index) ? "fas" : "far"
                } fa-heart"></i>
              </div>
              <div class="btn-delete">
                <i class="fa-solid fa-trash"></i>
              </div>
            </div>
          </div>`;
          }
          return "";
        })
        .filter(Boolean);

      searchSongs.innerHTML =
        searchResult.length > 0
          ? searchResult.join("")
          : "Oops, no results found ＞﹏＜";
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
      const uploadBtn = e.target.closest(".upload-song");
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

      if (uploadBtn) {
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

    // Upload bài hát mới
    uploadSong.onclick = function () {
      uploadAudioInput.click();
    };

    let uploadedAudioFile = null;
    uploadAudioInput.onchange = function (e) {
      const file = e.target.files[0];
      if (file && file.type.startsWith("audio/")) {
        uploadedAudioFile = file;
        songNameInput.value = file.name.replace(/\.[^/.]+$/, "");
        singerNameInput.value = "";
        previewImage.src = "./assets/img/no-Image.png";
        uploadModal.style.display = "flex";
      } else {
        alert("Please select a valid audio file!");
      }
    };

    uploadImageBtn.onclick = function () {
      uploadImageInput.click();
    };

    uploadImageInput.onchange = function (e) {
      const file = e.target.files[0];
      if (file && file.type.startsWith("image/")) {
        const imageURL = URL.createObjectURL(file);
        previewImage.src = imageURL;
      } else {
        alert("Please select a valid image file!");
      }
    };

    saveSongBtn.onclick = function () {
      if (uploadedAudioFile) {
        // Đọc file audio thành base64
        const readerAudio = new FileReader();
        readerAudio.onload = function (e) {
          const audioBase64 = e.target.result;

          // Đọc file ảnh thành base64 (nếu có)
          const imageFile = uploadImageInput.files[0];
          if (imageFile) {
            const readerImage = new FileReader();
            readerImage.onload = function (ev) {
              const imageBase64 = ev.target.result;
              addSong(audioBase64, imageBase64);
            };
            readerImage.readAsDataURL(imageFile);
          } else {
            // Nếu không có ảnh thì dùng ảnh mặc định
            addSong(audioBase64, "./assets/img/no-Image.png");
          }
        };
        readerAudio.readAsDataURL(uploadedAudioFile);
      }

      function addSong(audioBase64, imageBase64) {
        const newSong = {
          name: songNameInput.value || "Unknown Song",
          singer: singerNameInput.value || "Unknown Singer",
          path: audioBase64,
          image: imageBase64,
        };

        // Thêm bài hát mới vào đầu danh sách
        app.songs.unshift(newSong);

        // Nếu đang phát nhạc ở bài khác bài đầu, tăng currentIndex lên 1
        if (app.songs.length > 1 && app.currentIndex !== 0) {
          app.currentIndex += 1;
          app.setConfig("currentSongIndex", app.currentIndex);
        }

        // Tăng index likedList lên 1 để giữ trạng thái liked cho các bài hát cũ
        if (likedList.length > 0) {
          likedList = likedList.map((idx) => Number(idx) + 1);
          app.setConfig("likedListIndex", likedList);
        }

        // Lưu danh sách bài hát vào localStorage
        app.setConfig("songs", app.songs);

        // Render lại danh sách bài hát
        app.render(app.songs, playlist);

        // Gán lại class active cho bài hát đang phát
        app.loadCurrentSong();

        // Nếu trước đó đang phát nhạc thì phát tiếp
        if (app.isPlaying) {
          audio.play();
        }

        // Đóng modal và reset các giá trị
        uploadModal.style.display = "none";
        uploadedAudioFile = null;
        uploadAudioInput.value = "";
        uploadImageInput.value = "";
      }
    };

    cancelSongBtn.onclick = function () {
      uploadModal.style.display = "none";
      uploadedAudioFile = null;
      uploadAudioInput.value = "";
      uploadImageInput.value = "";
    };

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
      app.isPlaying = true;
      player.classList.add("playing");
      cdThumbAnimate.play();
      app.setConfig("isPlaying", true); // Lưu trạng thái phát
    };
    audio.onpause = function () {
      app.isPlaying = false;
      player.classList.remove("playing");
      cdThumbAnimate.pause();
      app.setConfig("isPlaying", false); // Lưu trạng thái dừng
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
      const deleteIcon = e.target.closest(".btn-delete i");

      if (deleteIcon) {
        // Xử lý khi nhấn vào biểu tượng thùng rác
        let deletedSong = deleteIcon.closest(".song");
        const confirmDelete = confirm("Do you want to delete this song?");
        if (confirmDelete) {
          const index = Number(deletedSong.dataset.index);

          // Xóa khỏi danh sách yêu thích nếu có
          likedList = likedList
            .filter((i) => i != index)
            .map((i) => (i > index ? i - 1 : i));
          app.setConfig("likedListIndex", likedList);

          // Xóa khỏi mảng dữ liệu
          app.songs.splice(index, 1);

          // Cập nhật currentIndex nếu cần
          if (app.currentIndex > index) {
            app.currentIndex--;
          } else if (app.currentIndex === index) {
            app.currentIndex =
              app.currentIndex >= app.songs.length ? 0 : app.currentIndex;
          }

          // Lưu lại vào localStorage
          app.setConfig("songs", app.songs);

          // Render lại danh sách
          app.render(app.songs, playlist);

          // Nếu còn bài hát thì load lại bài hiện tại, nếu không thì dừng audio
          if (app.songs.length > 0) {
            app.loadCurrentSong();
          } else {
            audio.pause();
            audio.src = "";
            heading.textContent = "";
            cdThumb.style.backgroundImage = "";
            // Disable các nút điều khiển nếu muốn
            playBtn.disabled = true;
            nextBtn.disabled = true;
            prevBtn.disabled = true;
            progress.value = 0;
          }
        }
        return;
      } else if (!favoriteIcon && songNode) {
        // Xử lý khi click để chuyển bài hát
        app.currentIndex = Number(songNode.dataset.index);
        app.loadCurrentSong();
        audio.play();
      } else if (favoriteIcon) {
        // Xử lý khi thả tim hoặc bỏ tim
        let favoriteSong = favoriteIcon.closest(".song");
        app.handleLikedList([favoriteSong.dataset.index], "toggle");
      }
    };
    // #endregion Playlist
  },

  // Xử lý danh sách bài hát yêu thích
  handleLikedList: function (favSongIndex, action = "toggle") {
    favSongIndex.forEach((index) => {
      index = Number(index);
      const songElems = $$(`.song[data-index="${index}"]`);
      if (!songElems.length) return;

      songElems.forEach((songElem) => {
        const icon = songElem.querySelector(".favorite i");
        if (action === "toggle") {
          const isLiked = songElem.classList.toggle("liked");
          icon.classList.toggle("fas", isLiked);
          icon.classList.toggle("far", !isLiked);
          if (isLiked) {
            if (!likedList.includes(index)) likedList.push(index);
          } else {
            likedList = likedList.filter((i) => i !== index);
          }
        } else if (action === "like") {
          songElem.classList.add("liked");
          icon.classList.add("fas");
          icon.classList.remove("far");
        } else if (action === "unlike") {
          songElem.classList.remove("liked");
          icon.classList.remove("fas");
          icon.classList.add("far");
        } else if (action === "delete") {
          likedList = likedList.filter((i) => i !== index);
        }
      });
    });
    // Lưu lại likedList
    app.setConfig("likedListIndex", likedList);
    // Cập nhật lại favoriteList UI
    app.updateFavoriteList();
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
      app.setConfig("randomFilter", randomFilter);
    }

    do {
      newIndex = Math.floor(Math.random() * this.songs.length);
    } while (randomFilter.includes(newIndex));

    this.currentIndex = newIndex;
    this.loadCurrentSong();
    audio.play();

    // Khi randomFilter thay đổi:
    randomFilter.push(this.currentIndex);
    app.setConfig("randomFilter", randomFilter);

    // Khi reset randomFilter:
    randomFilter.length = 0;
    randomFilter.push(this.currentIndex);
    app.setConfig("randomFilter", randomFilter);
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
      likedList = this.config.likedListIndex;
    }

    // Load randomFilter
    randomFilter = this.config.randomFilter || [];
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

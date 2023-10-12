import fs from "fs";
import path from "path";
import Vue from "vue";
import Vuex from "vuex";
import createLogger from "vuex/dist/logger";
import { Counter, loadKeyValueCSV, saveKeyValueCSV } from "./utils";

function readBasenames(folder, ext) {
  return fs.readdirSync(folder).filter((basename) => {
    return ext === undefined || path.extname(basename) === ext;
  });
}

function fixTableSync(folder, table) {
  // Fix the table if the video does not appear in table but in the folder
  readBasenames(folder, ".mp4").forEach((basename) => {
    if (!(basename in table)) {
      table[basename] = "";
    }
  });
  // ForEach is synchronous, don't worry.
  return table;
}

function createCSVDataStore(basename, namespaced = true) {
  return {
    namespaced: namespaced,
    state: { tables: {}, dirty: false },
    mutations: {
      setTable(state, { folder, table }) {
        Vue.set(state.tables, folder, table);
      },
      set(state, { video, value }) {
        state.dirty = true;
        Vue.set(state.tables[path.dirname(video)], path.basename(video), value);
      },
      clearDirty(state) {
        state.dirty = false;
      },
    },
    getters: {
      getTable(state) {
        return (folder) => {
          return state.tables[folder];
        };
      },
      get(state) {
        return (video) => {
          return state.tables[path.dirname(video)][path.basename(video)];
        };
      },
      folders(state) {
        let folders = Object.keys(state.tables);
        folders.sort();
        return folders;
      },
      videos(state, getters) {
        return getters.folders
          .map((folder) => {
            let filenames = Object.keys(getters.getTable(folder));
            filenames.sort();
            return filenames.map((filename) => path.join(folder, filename));
          })
          .flat();
      },
      collected(state, getters) {
        let annotations = {};
        getters.videos.forEach((video) => {
          let parts = video.split(path.sep);
          let name = parts.slice(-2).join(path.sep);
          annotations[name] = getters.get(video);
        });
        return annotations;
      },
      lexicon(state, getters) {
        return Counter(
          Object.values(getters.collected)
            .map((s) => s.split(" "))
            .flat()
            .filter((s) => s)
        );
      },
    },
    actions: {
      load({ commit }, folders) {
        // Folder should be in full path
        // Each folder has one "basename" file that contains a key-value csv table
        // They key is the basename instead of fullpath
        return Promise.all(
          folders.map((folder) => {
            return new Promise((resolve) => {
              loadKeyValueCSV(path.join(folder, basename))
                .then((table) => {
                  commit("setTable", {
                    folder,
                    table: fixTableSync(folder, table),
                  });
                  resolve();
                })
                .catch(() => {
                  commit("setTable", {
                    folder,
                    table: fixTableSync(folder, {}),
                  });
                  resolve();
                });
            });
          })
        );
      },
      save({ state, commit, getters }, folder) {
        return new Promise((resolve, reject) => {
          if (state.dirty) {
            saveKeyValueCSV(
              path.join(folder, basename),
              getters.getTable(folder)
            )
              .then(() => {
                commit("clearDirty");
                resolve();
              })
              .catch(reject);
          } else {
            resolve();
          }
        });
      },
      import(
        { commit, dispatch, getters },
        { filePath, encoding, overwrite = false }
      ) {
        return new Promise((resolve, reject) => {
          loadKeyValueCSV(filePath, true, encoding)
            .then((records) => {
              let counter = 0;
              getters.videos.forEach((video) => {
                let parts = video.split(path.sep);
                let name = parts.slice(-2).join(path.sep);
                if (overwrite || getters.get(video).length === 0) {
                  if (name in records && records[name].length > 0) {
                    commit("set", { video, value: records[name] });
                    counter += 1;
                  }
                }
              });
              getters.folders.forEach((folder) => {
                dispatch("save", folder);
              });
              resolve(counter);
            })
            .catch(reject);
        });
      },
      export({ getters }, { filePath, encoding }) {
        return saveKeyValueCSV(filePath, getters.collected, true, encoding);
      },
      exportLexicon({ getters }, { filePath, encoding }) {
        return saveKeyValueCSV(filePath, getters.lexicon, false, encoding);
      },
    },
  };
}

function createVideoDataStore(namespaced = true) {
  return {
    namespaced: namespaced,
    state: { lists: {} },
    mutations: {
      setList(state, { folder, list }) {
        state.lists[folder] = list;
      },
    },
    getters: {
      getList(state) {
        return (folder) => {
          return state.lists[folder];
        };
      },
      get(state) {
        return (folder, index) => state.lists[folder][index];
      },
    },
    actions: {
      load({ commit }, folders) {
        return Promise.all(
          folders.map((folder) => {
            return new Promise((resolve) => {
              commit("setList", {
                folder,
                list: readBasenames(folder, ".mp4").map((basename) =>
                  path.join(folder, basename)
                ),
              });
              resolve();
            });
          })
        );
      },
    },
  };
}

Vue.use(Vuex);

const debug = process.env.NODE_ENV !== "production" && false;

export default new Vuex.Store({
  modules: {
    captions: createCSVDataStore("captions.csv", true),
    annotations: createCSVDataStore("annotations.csv", true),
    videos: createVideoDataStore(true),
  },
  strict: debug,
  plugins: debug ? [createLogger()] : [],
  state: {
    windowSize: {},
    // Root folder, which contains the video folders.
    root: null,
    // Video folders in full path
    folders: [],
    // Current active video folder
    activeFolder: null,
  },
  mutations: {
    setWindowSize(state, { height, width }) {
      Vue.set(state.windowSize, "height", height);
      Vue.set(state.windowSize, "width", width);
    },
    setRoot(state, root) {
      state.root = root;
    },
    setFolders(state, folders) {
      state.folders = folders;
    },
    activateFolder(state, activeFolder) {
      state.activeFolder = activeFolder;
    },
    deactivateFolder(state) {
      state.activeFolder = null;
    },
  },

  getters: {
    getAnnotatedVideos(state, getters) {
      return (folder) => {
        const videos = getters["videos/getList"](folder);
        return videos.filter((video) => {
          return getters["annotations/get"](video).length > 0;
        });
      };
    },
    getUnannotatedVideos(state, getters) {
      return (folder) => {
        const videos = getters["videos/getList"](folder);
        return videos.filter((video) => {
          return getters["annotations/get"](video).length === 0;
        });
      };
    },
    windowHeight(state) {
      return state.windowSize.height;
    },
    windowWidth(state) {
      return state.windowSize.width;
    },
    activeVideos(state, getters) {
      return getters["videos/getList"](state.activeFolder);
    },
    activeAnnotatedVideos(state, getters) {
      return getters.getAnnotatedVideos(state.activeFolder);
    },
    activeUnannotatedVideos(state, getters) {
      return getters.getUnannotatedVideos(state.activeFolder);
    },
    activeAnnotations(state, getters) {
      return getters["annotations/getTable"](state.activeFolder);
    },
    activeCaptions(state, getters) {
      return getters["captions/getTable"](state.activeFolder);
    },
  },
  actions: {
    loadRoot({ commit, dispatch }, root) {
      return new Promise((resolve, reject) => {
        commit("setRoot", root);

        const folders = fs
          .readdirSync(root)
          .map((basename) => {
            return path.join(root, basename);
          })
          .filter((files) => {
            return fs.lstatSync(files).isDirectory();
          });

        Promise.all([
          dispatch("videos/load", folders),
          dispatch("captions/load", folders),
          dispatch("annotations/load", folders),
        ])
          .then(() => {
            commit("setFolders", folders);
            resolve();
          })
          .catch(reject);
      });
    },
  },
});

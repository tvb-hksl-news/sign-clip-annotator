<template>
  <div>
    <div style="margin-bottom: 0" class="buttons has-addons">
      <button
        style="margin-bottom: 0"
        class="button is-light"
        v-on:click="send('try-open-root')"
      >
        <span class="icon is-small">
          <i class="far fa-folder-open"></i>
        </span>
        <span>Open</span>
      </button>

      <button
        v-if="root"
        style="margin-bottom: 0"
        class="button is-light"
        v-on:click="$emit('switch-panel', 'lexicon')"
      >
        <span class="icon is-small">
          <i class="fas fa-chart-pie"></i>
        </span>
        <span>Lexicon</span>
      </button>

      <button
        v-if="root"
        style="margin-bottom: 0"
        class="button is-light"
        v-on:click="send('try-export-annotations')"
      >
        <span class="icon is-small">
          <i class="fas fa-share-square"></i>
        </span>
        <span>Export</span>
      </button>

      <button
        v-if="root"
        style="margin-bottom: 0"
        class="button is-light"
        v-on:click="send('try-recover')"
      >
        <span class="icon is-small">
          <i class="fas fa-tools"></i>
        </span>
        <span>Recover</span>
      </button>
    </div>

    <br />

    <div class="columns is-mobile" v-if="root">
      <div class="column is-offset-1 is-10">
        <table class="table is-fullwidth is-bordered is-striped">
          <thead>
            <tr>
              <th>Folder</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tfoot>
            <tr>
              <th>Overall</th>
              <th>
                <div class="progress-bar">
                  <span
                    >{{ overallProgress | percent }} ({{ overallDone }}/{{
                      overallTotal
                    }})</span
                  >
                  <progress
                    class="progress is-primary"
                    :value="overallProgress * 100"
                    max="100"
                    style="display: inline-block"
                  />
                </div>
              </th>
            </tr>
          </tfoot>
          <tbody>
            <tr v-for="folder in folders" v-bind:key="folder">
              <td>
                <a v-on:click="activateFolder(folder)">
                  <span>{{ folder | basename }}</span>
                </a>
              </td>
              <td>
                <div class="progress-bar">
                  <span
                    >{{ progress(folder) | percent }} ({{ done(folder) }}/{{
                      total(folder)
                    }})</span
                  >
                  <progress
                    class="progress is-primary"
                    :value="progress(folder) * 100"
                    max="100"
                    style="display: inline-block"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <br />
  </div>
</template>

<style>
.progress-bar > span {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}

.progress-bar {
  text-align: center;
  position: relative;
}
</style>

<script>
import path from "path";
import { ipcRenderer } from "electron";
import { mapState, mapMutations, mapGetters, mapActions } from "vuex";
import { toastedShow } from "../../utils";

export default {
  created() {
    let vm = this;

    ipcRenderer.on("open-root", (event, root) => {
      vm.loadRoot(root)
        .then(() => {
          toastedShow('Folder "' + root + '"  is loaded.');
        })
        .catch((err) => toastedShow(err, "error"));
    });

    ipcRenderer.on("export-annotations", (event, filePath) => {
      vm.exportAnnotations({ filePath, encoding: "utf16" })
        .then(() => {
          toastedShow(
            "Annotations have been collected and exported to " + filePath + "."
          );
        })
        .catch((err) => toastedShow(err, "error"));
    });

    ipcRenderer.on("recover", (event, filePath) => {
      vm.importAnnotations({
        filePath,
        encoding: "utf16",
        overwrite: true,
      })
        .then((counter) => {
          console.log(counter);
          toastedShow(
            "Successfully recovered " +
              counter +
              ' annotations from "' +
              filePath +
              '".'
          );
        })
        .catch((err) => toastedShow(err, "error"));
    });
  },
  destroyed() {
    ipcRenderer.removeAllListeners("open-root");
    ipcRenderer.removeAllListeners("export-annotations");
    ipcRenderer.removeAllListeners("recover");
  },
  methods: {
    send: ipcRenderer.send,
    ...mapMutations(["activateFolder"]),
    ...mapActions(["loadRoot"]),
    ...mapActions({
      importAnnotations: "annotations/import",
      exportAnnotations: "annotations/export",
    }),
  },
  computed: {
    ...mapState(["root", "folders"]),
    ...mapGetters(["progress"]),
    ...mapGetters({
      lexicon: "annotations/lexicon",
    }),
    ...mapGetters({ getVideos: "videos/getList" }),
    ...mapGetters(["getAnnotatedVideos"]),
    done() {
      return (folder) => {
        return this.getAnnotatedVideos(folder).length;
      };
    },
    total() {
      return (folder) => {
        return this.getVideos(folder).length;
      };
    },
    progress() {
      return (folder) => {
        return this.done(folder) / this.total(folder);
      };
    },
    overallDone() {
      return this.folders.reduce((acc, folder) => {
        return acc + this.getAnnotatedVideos(folder).length;
      }, 0);
    },
    overallTotal() {
      return this.folders.reduce((acc, folder) => {
        return acc + this.getVideos(folder).length;
      }, 0);
    },
    overallProgress() {
      return this.overallDone / this.overallTotal;
    },
  },
  filters: {
    basename(s) {
      return path.basename(s);
    },
    percent(value) {
      if (!isNaN(value)) {
        return Math.round(value * 1000) / 10 + "%";
      }
      return "NaN";
    },
  },
};
</script>

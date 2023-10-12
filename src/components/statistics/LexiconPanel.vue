 <template>
  <div>
    <div style="margin-bottom: 0" class="buttons has-addons">
      <button
        style="margin-bottom: 0"
        class="button is-light"
        v-on:click="$emit('go-back')"
      >
        <span class="icon is-small">
          <i class="fas fa-arrow-circle-left"></i>
        </span>
        <span>Go Back</span>
      </button>

      <button
        style="margin-bottom: 0"
        class="button is-light"
        v-on:click="send('try-export-lexicon')"
      >
        <span class="icon is-small">
          <i class="fas fa-share-square"></i>
        </span>
        <span>Export</span>
      </button>
    </div>

    <br />

    <div class="column is-offset-1 is-10">
      <table class="table is-fullwidth is-bordered is-striped">
        <thead>
          <tr>
            <th>Lexeme</th>
            <th>Frequency</th>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <th>Total</th>
            <th>
              {{ sortedLexiconEntries.reduce((acc, e) => acc + e[1], 0) }}
            </th>
          </tr>
        </tfoot>
        <tbody>
          <tr v-for="entry in sortedLexiconEntries" v-bind:key="entry[0]">
            <td>{{ entry[0] }}</td>
            <td>{{ entry[1] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <br />
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import { mapActions, mapGetters } from "vuex";
import { toastedShow } from "../../utils";
export default {
  created() {
    let vm = this;
    ipcRenderer.on("export-lexicon", (event, filePath) => {
      vm.exportLexicon({ filePath, encoding: "utf16" }).then(() => {
        toastedShow('Lexicon has been exported to "' + filePath + '"');
      });
    });
  },
  destroyed() {
    ipcRenderer.removeAllListeners("export-lexicon");
  },
  methods: {
    send: ipcRenderer.send,
    ...mapActions({ exportLexicon: "annotations/exportLexicon" }),
  },
  computed: {
    ...mapGetters({ lexicon: "annotations/lexicon" }),
    sortedLexiconEntries() {
      let entries = Object.entries(this.lexicon);
      entries.sort((a, b) => {
        if (a[1] == b[1]) {
          return a[0] < b[0] ? -1 : 1;
        }
        return a[1] < b[1] ? 1 : -1;
      });

      return entries;
    },
  },
};
</script>
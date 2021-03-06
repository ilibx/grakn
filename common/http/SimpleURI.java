/*
 * GRAKN.AI - THE KNOWLEDGE GRAPH
 * Copyright (C) 2018 Grakn Labs Ltd
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

package grakn.core.common.http;

import com.google.common.base.Preconditions;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * This Util class just takes care of going from host and port to string and vice-versa
 * The URI class would require a schema
 *
 */
public class SimpleURI {
    private final static String DEFAULT_PROTOCOL_NAME = "http";
    private final int port;
    private final String host;

    public SimpleURI(String uri) {
        String[] tokens = uri.split(":");
        Preconditions.checkArgument(
                tokens.length == 2 || (tokens.length == 3 && tokens[1].contains("//")),
                "Malformed URI " + uri);
        // if it has the schema, we start parsing from after
        int hostTokenIndex = tokens.length == 3 ? 1 : 0;
        this.host = tokens[hostTokenIndex].replace("/", "").trim();
        this.port = Integer.parseInt(tokens[hostTokenIndex + 1].trim());
    }

    public SimpleURI(String host, int port) {
        this(host + ":" + port);
    }

    public int getPort() {
        return port;
    }

    public String getHost() {
        return host;
    }

    @Override
    public String toString() {
        return String.format("%s:%d", host, port);
    }

    public URI toURI() {
        try {
            return new URI(DEFAULT_PROTOCOL_NAME, null, host, port, null, null, null);
        } catch (URISyntaxException e) {
            throw new IllegalStateException(e);
        }
    }
}
